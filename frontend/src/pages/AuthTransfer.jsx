import { useEffect } from "react";
import { authService } from "../services/api";

export default function AuthTransfer() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (token) {
      localStorage.setItem("token", token);
      authService.getCurrentUser()
        .then(user => {
          const role = user?.role;
          const isDescon = user?.company_name?.toLowerCase() === 'descon';
          if (role === 'user' || role === 'manager') {
            window.location.replace("/reports");
          } else if (!isDescon) {
            window.location.replace("/overview");
          } else {
            window.location.replace("/dashboard");
          }
        })
        .catch(() => {
          window.location.replace("/dashboard");
        });
    } else {
      window.location.replace("/signin");
    }
  }, []);

  return <div>Signing you in...</div>;
}
