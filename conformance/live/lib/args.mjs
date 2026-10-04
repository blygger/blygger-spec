// Shared CLI flags for crawl.mjs / run.mjs.
export function parseArgs(argv) {
  const o = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const v = () => argv[++i];
    switch (a) {
      case "--offline": o.offline = true; break;            // cache only, no network
      case "--refresh": o.ttlHours = 0; break;               // ignore cache age
      case "--ttl-hours": o.ttlHours = Number(v()); break;   // cache freshness window
      case "--max-items": o.maxItems = Number(v()); break;   // per-origin item cap
      case "--max-origins": o.maxOrigins = Number(v()); break;
      case "--per-host": o.perHost = Number(v()); break;     // concurrent requests per host
      case "--concurrency": o.global = Number(v()); break;   // concurrent requests overall
      case "--timeout-ms": o.timeoutMs = Number(v()); break;
      case "--no-blogrolls": o.followBlogrolls = false; break;
      case "--skip-crawl": o.skipCrawl = true; break;        // re-check the committed crawl.json
      case "--verbose": o.verbose = true; break;
      case "--quiet": o.quiet = true; break;
      default: throw new Error("unknown flag " + a);
    }
  }
  return o;
}
