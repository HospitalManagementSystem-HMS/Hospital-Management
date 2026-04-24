import { Link } from "react-router-dom";
import { Button } from "../ui/Button.jsx";

export function NotFoundPage() {
  return (
    <div className="min-h-full flex items-center justify-center px-4 py-10">
      <div className="text-center">
        <div className="text-3xl font-semibold text-slate-900">404</div>
        <div className="mt-2 text-sm text-slate-600">Page not found.</div>
        <Link to="/">
          <Button className="mt-4">Go home</Button>
        </Link>
      </div>
    </div>
  );
}

