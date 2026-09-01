import type { Instrumentation } from "next";

// Server-side error hook: every uncaught error in a Server Component, Route
// Handler, or Server Action passes through here.
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  const { captureError } = await import("@/lib/observe");
  captureError(err, {
    where: `server:${context.routerKind}:${context.routePath || request.path}`,
    extra: { method: request.method, renderSource: context.renderSource },
  });
};
