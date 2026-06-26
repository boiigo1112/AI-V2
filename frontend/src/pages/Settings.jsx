import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Settings as SettingsIcon, Key, User, Shield } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

const profileSchema = z.object({
  full_name: z.string().optional(),
  email: z.string().email('Invalid email'),
});

const passwordSchema = z.object({
  current_password: z.string().min(1, 'Required'),
  new_password: z.string().min(6, 'Min 6 characters'),
  confirm: z.string().min(1, 'Required'),
}).refine((d) => d.new_password === d.confirm, {
  message: 'Passwords do not match',
  path: ['confirm'],
});

function Settings() {
  const { user, refreshUser } = useAuth();

  const profile = useForm({ resolver: zodResolver(profileSchema), defaultValues: { full_name: user?.full_name || '', email: user?.email || '' } });
  const password = useForm({ resolver: zodResolver(passwordSchema) });

  const saveProfile = async (data) => {
    try {
      const payload = {};
      if (data.full_name !== (user?.full_name || '')) payload.full_name = data.full_name;
      if (data.email !== user?.email) payload.email = data.email;
      if (Object.keys(payload).length === 0) { toast.error('No changes'); return; }
      await api.put('/settings/profile', payload);
      await refreshUser();
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Update failed');
    }
  };

  const changePassword = async (data) => {
    try {
      await api.put('/settings/password', {
        current_password: data.current_password,
        new_password: data.new_password,
      });
      toast.success('Password changed');
      password.reset({ current_password: '', new_password: '', confirm: '' });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to change password');
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <SettingsIcon className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Settings</h1>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Profile</h2>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={profile.handleSubmit(saveProfile)} className="space-y-4">
              <Input label="Username" value={user?.username || ''} disabled />
              <Input label="Email" type="email" {...profile.register('email')} error={profile.formState.errors.email?.message} />
              <Input label="Full Name" {...profile.register('full_name')} />
              <Button type="submit" disabled={profile.formState.isSubmitting}>
                {profile.formState.isSubmitting ? 'Saving...' : 'Save Profile'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Key className="w-5 h-5 text-warning" />
              <h2 className="text-lg font-semibold">Change Password</h2>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={password.handleSubmit(changePassword)} className="space-y-4">
              <Input label="Current Password" type="password" {...password.register('current_password')} error={password.formState.errors.current_password?.message} />
              <Input label="New Password" type="password" {...password.register('new_password')} error={password.formState.errors.new_password?.message} />
              <Input label="Confirm New Password" type="password" {...password.register('confirm')} error={password.formState.errors.confirm?.message} />
              <Button type="submit" disabled={password.formState.isSubmitting}>
                {password.formState.isSubmitting ? 'Changing...' : 'Change Password'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-success" />
              <h2 className="text-lg font-semibold">Role</h2>
            </div>
          </CardHeader>
          <CardContent>
            <Input label="Current Role" value={user?.role?.name || ''} disabled />
            <p className="text-xs text-muted mt-2">Contact an administrator to change your role.</p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

export default Settings;
