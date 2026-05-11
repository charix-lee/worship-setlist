import { Outlet, createRootRoute } from '@tanstack/react-router';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '../contexts/AuthContext';

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  return (
    <AuthProvider>
      <Outlet />
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            borderRadius: '10px',
            background: '#333',
            color: '#fff',
          },
        }}
      />
    </AuthProvider>
  );
}
