import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../stores/authStore';

const ADMIN_ROLES = ['farm_admin', 'hr_admin', 'supervisor', 'master'];

export default function useAuth(requiredRole) {
  const { isAuthenticated, currentUser } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
    } else if (requiredRole && currentUser?.role !== requiredRole) {
      const dest = currentUser?.role === 'worker'
        ? '/worker'
        : ADMIN_ROLES.includes(currentUser?.role) ? '/admin' : '/login';
      navigate(dest, { replace: true });
    }
  }, [isAuthenticated, currentUser, requiredRole, navigate]);

  return { isAuthenticated, currentUser };
}
