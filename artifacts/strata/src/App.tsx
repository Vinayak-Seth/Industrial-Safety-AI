import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { AppLayout } from '@/components/layout/app-layout';

import DashboardPage from '@/pages/dashboard';
import DocumentsPage from '@/pages/documents/index';
import DocumentDetailPage from '@/pages/documents/detail';
import CopilotPage from '@/pages/copilot';
import KnowledgeGraphPage from '@/pages/knowledge-graph';
import CompliancePage from '@/pages/compliance';
import MaintenancePage from '@/pages/maintenance';
import DrawingsPage from '@/pages/drawings/index';
import DrawingDetailPage from '@/pages/drawings/detail';
import QmsPage from '@/pages/qms';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={DashboardPage} />
        <Route path="/documents" component={DocumentsPage} />
        <Route path="/documents/:id" component={DocumentDetailPage} />
        <Route path="/copilot" component={CopilotPage} />
        <Route path="/knowledge-graph" component={KnowledgeGraphPage} />
        <Route path="/compliance" component={CompliancePage} />
        <Route path="/maintenance" component={MaintenancePage} />
        <Route path="/drawings" component={DrawingsPage} />
        <Route path="/drawings/:id" component={DrawingDetailPage} />
        <Route path="/qms" component={QmsPage} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
