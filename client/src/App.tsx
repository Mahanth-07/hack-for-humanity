import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import MapView from "./pages/MapView";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MapView />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
