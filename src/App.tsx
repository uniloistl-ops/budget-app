import { Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { Overview } from "./pages/Overview";
import { Transactions } from "./pages/Transactions";
import { Categories } from "./pages/Categories";
import { Goals } from "./pages/Goals";
import { Paycheck } from "./pages/Paycheck";
import { Settings } from "./pages/Settings";

function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<Overview />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route path="/categories" element={<Categories />} />
        <Route path="/goals" element={<Goals />} />
        <Route path="/paycheck" element={<Paycheck />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}

export default App;
