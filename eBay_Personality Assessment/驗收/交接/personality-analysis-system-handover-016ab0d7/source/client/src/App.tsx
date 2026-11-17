import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import { trpc } from "@/lib/trpc";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, RotateCcw, X } from "lucide-react";
import { lazy, Suspense, useEffect, useRef, useState } from "react";

const AdminDashboard = lazy(() => import("@/pages/AdminDashboard"));
const AdminInvite = lazy(() => import("@/pages/AdminInvite"));
const Privacy = lazy(() => import("@/pages/Privacy"));
const NotFound = lazy(() => import("@/pages/NotFound"));

function ServiceErrorNotice() {
  const MAX_API_RETRIES = 3;
  const RETRY_COOLDOWN_SECONDS = 5;
  const queryClient = useQueryClient();
  const recordApiError = trpc.adminTools.audit.recordApiError.useMutation({ onError: () => undefined });
  const [message, setMessage] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [cooldown, setCooldown] = useState(0);
  const recordedErrors = useRef(new Set<string>());

  useEffect(() => {
    const isServiceError = (error: unknown) => {
      const text = error instanceof Error ? error.message : String(error ?? "");
      return /服務正在重新啟動|Unexpected token|Failed to fetch|SERVICE_UNAVAILABLE|503|HTML/i.test(text);
    };
    const getRoute = (key: unknown) => Array.isArray(key) ? key.map(String).filter(Boolean).join(".") : "unknown";
    const report = (error: unknown, route: string) => {
      const text = error instanceof Error ? error.message : String(error ?? "服務錯誤");
      const fingerprint = `${route}:${text}`;
      if (!recordedErrors.current.has(fingerprint)) {
        recordedErrors.current.add(fingerprint);
        recordApiError.mutate({ route, message: text.slice(0, 500) });
      }
      setMessage("目前服務暫時無法使用，請再次嘗試 API 或重新載入頁面。");
    };
    const onQueryCacheChange = (event: { type: string; query?: { queryKey: unknown; state: { error: unknown } } }) => {
      if (event.type === "updated" && event.query?.state.error && isServiceError(event.query.state.error)) {
        report(event.query.state.error, getRoute(event.query.queryKey));
      }
    };
    const onMutationCacheChange = (event: { type: string; mutation?: { options?: { mutationKey?: unknown }; state: { error: unknown } } }) => {
      if (event.type === "updated" && event.mutation?.state.error && isServiceError(event.mutation.state.error)) {
        report(event.mutation.state.error, getRoute(event.mutation.options?.mutationKey));
      }
    };
    const unsubscribeQuery = queryClient.getQueryCache().subscribe(onQueryCacheChange);
    const unsubscribeMutation = queryClient.getMutationCache().subscribe(onMutationCacheChange);
    return () => { unsubscribeQuery(); unsubscribeMutation(); };
  }, [queryClient, recordApiError]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  if (!message) return null;
  const retryApi = async () => {
    if (retrying || cooldown > 0 || retryCount >= MAX_API_RETRIES) return;
    setRetrying(true);
    setRetryCount((value) => value + 1);
    setCooldown(RETRY_COOLDOWN_SECONDS);
    setMessage(null);
    await queryClient.refetchQueries({ type: "active" });
    const stillFailing = queryClient.getQueryCache().getAll().some((query) => query.state.error);
    if (!stillFailing) setRetryCount(0);
    setRetrying(false);
  };
  const retryDisabled = retrying || cooldown > 0 || retryCount >= MAX_API_RETRIES;
  const retryLabel = retrying ? "連線中…" : cooldown > 0 ? `請稍候 ${cooldown} 秒` : retryCount >= MAX_API_RETRIES ? "已達重試上限" : `再次嘗試 API（剩餘 ${MAX_API_RETRIES - retryCount} 次）`;
  return <div className="service-error-notice" role="alert"><AlertTriangle size={20} aria-hidden="true" /><div className="service-error-copy"><strong>連線需要重新整理</strong><span>{message}</span><div className="service-error-actions"><button type="button" className="service-reload-button" disabled={retryDisabled} onClick={() => void retryApi()}><RotateCcw size={15} className={retrying ? "service-spin" : ""} /> {retryLabel}</button><button type="button" className="service-full-reload-button" onClick={() => window.location.reload()}>重新載入整頁</button></div></div><button type="button" className="service-error-close" aria-label="關閉提示" onClick={() => setMessage(null)}><X size={17} /></button></div>;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/submissions/:id" component={AdminDashboard} />
      <Route path="/admin/invite" component={AdminInvite} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" switchable>
        <TooltipProvider>
          <Toaster />
          <ServiceErrorNotice />
          <Suspense fallback={<div className="route-loading" role="status">正在載入頁面…</div>}>
            <Router />
          </Suspense>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
