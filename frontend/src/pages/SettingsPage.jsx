import { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useForm } from 'react-hook-form';
import { User, Lock, Bell, Moon, Shield } from 'lucide-react';
import { authApi } from '../services/api';
import { Button, Input, Card } from '../components/common';
import { toggleTheme } from '../store/slices/uiSlice';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const { user } = useSelector((s) => s.auth);
  const { theme } = useSelector((s) => s.ui);
  const dispatch = useDispatch();
  const [pwLoading, setPwLoading] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const onPasswordChange = async (data) => {
    if (data.new_password !== data.confirm_password) {
      toast.error("Passwords don't match");
      return;
    }
    setPwLoading(true);
    try {
      await authApi.changePassword({
        current_password: data.current_password,
        new_password: data.new_password,
      });
      toast.success('Password changed successfully');
      reset();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to change password');
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-white">Settings</h1>

      <Card>
        <div className="flex items-center gap-3 mb-4">
          <User size={18} className="text-violet-400" />
          <h2 className="font-semibold text-white">Profile</h2>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-violet-600 flex items-center justify-center text-2xl font-bold">
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div>
            <p className="text-white font-semibold">{user?.name}</p>
            <p className="text-gray-400 text-sm">{user?.email}</p>
            <p className="text-gray-600 text-xs mt-0.5">Member since {user?.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}</p>
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-center gap-3 mb-4">
          <Lock size={18} className="text-violet-400" />
          <h2 className="font-semibold text-white">Change Password</h2>
        </div>
        <form onSubmit={handleSubmit(onPasswordChange)} className="space-y-4">
          <Input label="Current Password" type="password" placeholder="••••••••" {...register('current_password', { required: true })} />
          <Input label="New Password" type="password" placeholder="••••••••" {...register('new_password', { required: true, minLength: 8 })} />
          <Input label="Confirm New Password" type="password" placeholder="••••••••" {...register('confirm_password', { required: true })} />
          <Button type="submit" loading={pwLoading}>Update Password</Button>
        </form>
      </Card>

      <Card>
        <div className="flex items-center gap-3 mb-4">
          <Moon size={18} className="text-violet-400" />
          <h2 className="font-semibold text-white">Appearance</h2>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white text-sm font-medium">Dark Mode</p>
            <p className="text-gray-500 text-xs mt-0.5">Currently: {theme === 'dark' ? 'Dark' : 'Light'}</p>
          </div>
          <button
            onClick={() => dispatch(toggleTheme())}
            className={`w-12 h-6 rounded-full transition-colors ${theme === 'dark' ? 'bg-violet-600' : 'bg-gray-700'}`}
          >
            <span className={`block w-4 h-4 rounded-full bg-white mx-1 transition-transform ${theme === 'dark' ? 'translate-x-6' : 'translate-x-0'}`} />
          </button>
        </div>
      </Card>

      <Card>
        <div className="flex items-center gap-3 mb-4">
          <Shield size={18} className="text-violet-400" />
          <h2 className="font-semibold text-white">Security</h2>
        </div>
        <div className="space-y-3 text-sm text-gray-400">
          <p>✅ JWT-secured sessions with auto-refresh</p>
          <p>✅ Account lockout after 5 failed login attempts</p>
          <p>✅ bcrypt password hashing (12 rounds)</p>
          <p>✅ All data is isolated per user</p>
        </div>
      </Card>
    </div>
  );
}
