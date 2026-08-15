import { DocPage, DocPager, Callout } from "@/components/DocPage";

export default function DeploymentPage() {
  return (
    <>
      <DocPage
        eyebrow="Ops & reliability"
        title="Deployment"
        description="Provider/store compatibility across Node servers, Node serverless, and edge runtimes (Vercel Edge, Cloudflare Workers), plus a custom-SessionStore recipe for edge-only persistence."
      >
        <p>
          Full coverage — including runnable Vercel Edge / Cloudflare
          Worker examples — lives in{" "}
          <a
            href="https://github.com/Sameer9823/samai-sdk/blob/master/docs/deployment.md"
            target="_blank"
            rel="noopener noreferrer"
          >
            <code>docs/deployment.md</code>
          </a>{" "}
          in the repository.
        </p>

        <Callout tone="guard" title="Native-dependency stores don't run at the edge">
          <code>SqliteSessionStore</code> (native <code>better-sqlite3</code>{" "}
          binding) and <code>FileCheckpointStore</code>/
          <code>FileSessionStore</code> (filesystem access) only work in
          Node runtimes. <code>RedisSessionStore</code> works anywhere that
          can reach your Redis instance over the network, including most
          edge runtimes.
        </Callout>
      </DocPage>
      <DocPager current="/docs/deployment" />
    </>
  );
}
