import asyncio
import json
import sys
from typing import List, Dict, Any
from datetime import datetime
from urllib.parse import urlparse
from crawl4ai import AsyncWebCrawler, BrowserConfig, CrawlerRunConfig, CacheMode  # Add VirtualScrollConfig if using virtual scroll

# Internal scraper function
async def _scrape_to_markdown(urls: List[str], description: str = "scrape") -> List[Dict[str, Any]]:
    """Scrape URLs to Markdown."""
    browser_config = BrowserConfig(
        user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    )
    run_config = CrawlerRunConfig(
        page_timeout=30000,
        delay_before_return_html=2.0,  # More time for JS grid render
        verbose=True,
        scan_full_page=True,
        scroll_delay=0.5,
        magic=True,
        wait_for_images=False,
        simulate_user=False,  # Disable temporarily to avoid detection
        cache_mode=CacheMode.BYPASS,
        word_count_threshold=0,  # Include short content (no filtering)
        css_selector="main, .main-content, #content, .product-grid",  # Target grid area
        js_code=[
            "window.scrollTo(0, document.body.scrollHeight);",
            "await new Promise(resolve => setTimeout(resolve, 2000));",
            "() => { const grid = document.querySelector('.product-grid, .products'); console.log('Grid elements:', grid ? grid.children.length : 0); }()"  # Debug log grid count
        ],
        wait_for="js:() => document.readyState === 'complete'",
        wait_for_timeout=30000
        # virtual_scroll_config=VirtualScrollConfig(container_selector=".product-grid", scroll_count=5)  # Uncomment if virtual scroll (content replaces)
    )
    async with AsyncWebCrawler(config=browser_config) as crawler:
        results = await crawler.arun_many(urls=urls, config=run_config)
        processed = []
        timestamp = datetime.now().strftime('%Y%m%d-%H:%M:%S')
        for i, result in enumerate(results):
            if result.success:
                domain = urlparse(result.url).netloc.replace('.', '_')
                processed.append({
                    'url': result.url,
                    'success': True,
                    'markdown': result.markdown,
                    'filename_suggestion': f"{timestamp}-{domain}-{description}-{i+1:02d}.md"
                })
            else:
                processed.append({
                    'url': result.url,
                    'success': False,
                    'error_message': result.error_message
                })
        return processed

TOOLS = {
    "tools": [
        {
            "name": "scrape_to_markdown",
            "description": "Scrape one or more URLs to clean Markdown for READMEs or workflows.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "urls": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "List of URLs to scrape"
                    },
                    "description": {
                        "type": "string",
                        "default": "scrape",
                        "description": "Label for output metadata"
                    }
                },
                "required": ["urls"]
            }
        }
    ]
}

async def handle_mcp_request(line: str) -> str:
    """Process a single MCP JSON-RPC request."""
    try:
        request = json.loads(line.strip())
        req_id = request.get('id')
        method = request.get('method')
        params = request.get('params', {})

        if method == "initialize":
            return json.dumps({
                "jsonrpc": "2.0",
                "id": req_id,
                "result": {
                    "protocolVersion": "2024-11-05",
                    "capabilities": {
                        "tools": {
                            "listChanged": False
                        },
                        "resources": {},
                        "prompts": {},
                        "roots": []
                    }
                }
            })

        elif method == "tools/list":
            return json.dumps({
                "jsonrpc": "2.0",
                "id": req_id,
                "result": TOOLS
            })

        elif method == "tools/call":
            tool_name = params.get("name")
            tool_args = params.get("arguments", {})
            if tool_name == "scrape_to_markdown":
                urls = tool_args.get("urls", [])
                description = tool_args.get("description", "scrape")
                if not urls:
                    return json.dumps({
                        "jsonrpc": "2.0",
                        "id": req_id,
                        "error": {"code": -32602, "message": "Invalid params: No URLs provided"}
                    })
                results = await _scrape_to_markdown(urls, description)
                return json.dumps({
                    "jsonrpc": "2.0",
                    "id": req_id,
                    "result": {
                        "content": [{"type": "text", "text": json.dumps(results, indent=2)}],
                        "isError": False
                    }
                })
            else:
                return json.dumps({
                    "jsonrpc": "2.0",
                    "id": req_id,
                    "error": {"code": -32601, "message": "Tool not found"}
                })

        else:
            return json.dumps({
                "jsonrpc": "2.0",
                "id": req_id,
                "error": {"code": -32601, "message": "Method not found"}
            })

    except json.JSONDecodeError:
        return json.dumps({"jsonrpc": "2.0", "error": {"code": -32700, "message": "Parse error"}})
    except Exception as e:
        return json.dumps({
            "jsonrpc": "2.0",
            "id": req_id if 'req_id' in locals() else None,
            "error": {"code": -32603, "message": str(e)}
        })

async def main():
    """Run MCP server over stdio."""
    loop = asyncio.get_running_loop()

    # Read from stdin
    stdin_reader = asyncio.StreamReader()
    stdin_protocol = asyncio.StreamReaderProtocol(stdin_reader)
    await loop.connect_read_pipe(lambda: stdin_protocol, sys.stdin)

    async def write_response(response):
        await loop.run_in_executor(None, lambda: sys.stdout.write(response + '\n') and sys.stdout.flush())

    while True:
        try:
            line = await stdin_reader.readline()
            if not line:
                break
            response = await handle_mcp_request(line.decode().strip())
            await write_response(response)
        except Exception as e:
            print(f"Error: {e}", file=sys.stderr)
            break

if __name__ == "__main__":
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        loop.run_until_complete(main())
    except KeyboardInterrupt:
        print("\nShutting down gracefully...", file=sys.stderr)
    finally:
        loop.run_until_complete(loop.shutdown_asyncgens())
        loop.close()
