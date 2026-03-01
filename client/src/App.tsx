import { Route, Switch } from "wouter";
  import { QueryClientProvider } from "@tanstack/react-query";
  import { queryClient } from "./lib/queryClient";
  import { Toaster } from "@/components/ui/toaster";
  import Dashboard from "./pages/Dashboard";
  import MapView from "./pages/MapView";
  import NotFound from "./pages/not-found";

  function App() {
    return (
      <QueryClientProvider client={queryClient}>
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/map" component={MapView} />
          <Route component={NotFound} />
        </Switch>
        <Toaster />
      </QueryClientProvider>
    );
  }

  export default App;
  