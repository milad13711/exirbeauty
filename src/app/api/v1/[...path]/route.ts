import { dispatch } from "@/server/http/router";
import { routeTable } from "@/server/routes";

// One entry point for the whole API: modules register their routes in src/server/modules,
// so adding a feature never needs a new file here.
export const dynamic = "force-dynamic";

async function handle(req: Request, ctx: RouteContext<"/api/v1/[...path]">) {
  const { path } = await ctx.params;
  return dispatch(req, path, routeTable);
}

export { handle as GET, handle as POST, handle as PUT, handle as PATCH, handle as DELETE };
