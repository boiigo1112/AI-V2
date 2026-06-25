import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Users as UsersIcon } from 'lucide-react';
import { useUsers, useRoles, useCreateUser, useUpdateUser, useDeleteUser } from '../hooks/use-users';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { Card } from '../components/ui/card';
import { Skeleton } from '../components/ui/skeleton';

const userSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  email: z.string().email('Invalid email format'),
  full_name: z.string().optional(),
  password: z.string().min(6, 'Min 6 characters').optional().or(z.literal('')),
  role_id: z.string().min(1, 'Role is required'),
});

function Users() {
  const { data: users = [], isLoading } = useUsers();
  const { data: roles = [] } = useRoles();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();

  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(userSchema),
    defaultValues: { username: '', email: '', full_name: '', password: '', role_id: '' },
  });

  const openCreate = () => {
    setEditingUser(null);
    reset({ username: '', email: '', full_name: '', password: '', role_id: '' });
    setShowModal(true);
  };

  const openEdit = (user) => {
    setEditingUser(user);
    reset({
      username: user.username,
      email: user.email,
      full_name: user.full_name || '',
      password: '',
      role_id: user.role_id,
    });
    setShowModal(true);
  };

  const onSubmit = async (data) => {
    try {
      if (editingUser) {
        const payload = { ...data };
        if (!payload.password) delete payload.password;
        await updateUser.mutateAsync({ id: editingUser.id, ...payload });
        toast.success('User updated');
      } else {
        await createUser.mutateAsync(data);
        toast.success('User created');
      }
      setShowModal(false);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Operation failed');
    }
  };

  const handleDelete = async (id, username) => {
    if (!window.confirm(`Delete user "${username}"?`)) return;
    try {
      await deleteUser.mutateAsync(id);
      toast.success('User deleted');
    } catch {
      toast.error('Delete failed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <UsersIcon className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">Users</h1>
        </div>
        <Button onClick={openCreate} disabled={isLoading}>
          <Plus className="w-4 h-4" />
          Add User
        </Button>
      </div>

      <Card>
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex gap-4">
                  <Skeleton className="h-5 flex-1" />
                  <Skeleton className="h-5 flex-1" />
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-24" />
                </div>
              ))}
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  {['Username', 'Email', 'Full Name', 'Role', 'Status', ''].map((h) => (
                    <th key={h} className="text-left text-xs font-semibold text-muted uppercase tracking-wider px-4 py-3.5">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {users.map((u, i) => (
                    <motion.tr
                      key={u.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="border-b border-border last:border-0 hover:bg-hover/50 transition-colors"
                    >
                      <td className="px-4 py-3.5">
                        <span className="font-medium text-sm">{u.username}</span>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-muted">{u.email}</td>
                      <td className="px-4 py-3.5 text-sm text-muted">{u.full_name || '—'}</td>
                      <td className="px-4 py-3.5">
                        <span className="text-xs bg-primary/15 text-primary px-2.5 py-0.5 rounded-full capitalize font-medium">
                          {u.role?.name}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        {u.is_active ? (
                          <span className="text-xs text-success font-medium">Active</span>
                        ) : (
                          <span className="text-xs text-muted font-medium">Inactive</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(u)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(u.id, u.username)}>
                            <Trash2 className="w-3.5 h-3.5 text-danger" />
                          </Button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
                {users.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center text-muted py-12 text-sm">
                      No users found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-lg bg-card rounded-2xl shadow-2xl border border-border"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 pb-0">
                <h2 className="text-lg font-semibold">
                  {editingUser ? 'Edit User' : 'Create User'}
                </h2>
              </div>
              <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
                <Input
                  label="Username"
                  {...register('username')}
                  error={errors.username?.message}
                />
                <Input
                  label="Email"
                  type="email"
                  {...register('email')}
                  error={errors.email?.message}
                />
                <Input
                  label="Full Name"
                  {...register('full_name')}
                  error={errors.full_name?.message}
                />
                {!editingUser && (
                  <Input
                    label="Password"
                    type="password"
                    {...register('password')}
                    error={errors.password?.message}
                  />
                )}
                <Select
                  label="Role"
                  {...register('role_id')}
                  error={errors.role_id?.message}
                >
                  <option value="">Select role</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </Select>
                <div className="flex justify-end gap-3 pt-2">
                  <Button variant="outline" type="button" onClick={() => setShowModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : editingUser ? 'Update' : 'Create'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default Users;
