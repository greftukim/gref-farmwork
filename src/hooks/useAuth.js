import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../stores/authStore';

export default function useAuth(requiredRole) {
  const { isAuthenticated, currentUser } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
    } else if (requiredRole && currentUser?.role !== requiredRole) {
      navigate(currentUser.role === 'admin' ? '/admin' : '/worker', { replace: true });
    }
  }, [isAuthenticated, currentUser, requiredRole, navigate]);

  return { isAuthenticated, currentUser };
}
