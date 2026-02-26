'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api } from '@/lib/axios';
import { usePermissions } from '@/store/useAuthStore';
import { getSocket } from '@/lib/socket';
import { toast } from 'sonner';
import { useSubscription } from '@/hooks/useSubscription';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import UpgradeModal from '@/components/subscription/UpgradeModal';
import {
  ArrowLeft,
  Loader2,
  UserPlus,
  Trash2,
  Crown,
  Shield,
  User as UserIcon,
  Eye,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Member {
  _id: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'member' | 'guest';
  isOwner: boolean;
}

export default function MembersPage() {
  const router = useRouter();
  const params = useParams();
  const workspaceId = params.id as string;
  const { can, isOwner } = usePermissions();

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member' | 'guest'>('member');
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [maxAdmins, setMaxAdmins] = useState<number>(1);
  const [currentAdminCount, setCurrentAdminCount] = useState<number>(0);

  // Subscription state
  const { canInviteMember } = useSubscription();
  const { whatsappNumber } = useSystemSettings();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  useEffect(() => {
    fetchMembers();
  }, [workspaceId]);

  // Socket.IO listeners for real-time member updates
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !workspaceId) return;

    console.log('[Members Page] Setting up socket listeners');

    const handleMemberAdded = (data: any) => {
      console.log('[Members Page] Member added:', data);
      if (data.workspaceId === workspaceId) {
        fetchMembers(); // Refresh members list
      }
    };

    const handleMemberRemoved = (data: any) => {
      console.log('[Members Page] Member removed:', data);
      if (data.workspaceId === workspaceId) {
        fetchMembers();
      }
    };

    const handleMemberUpdated = (data: any) => {
      console.log('[Members Page] Member updated:', data);
      if (data.workspaceId === workspaceId) {
        fetchMembers();
      }
    };

    socket.on('member:added', handleMemberAdded);
    socket.on('member:removed', handleMemberRemoved);
    socket.on('member:updated', handleMemberUpdated);

    return () => {
      socket.off('member:added', handleMemberAdded);
      socket.off('member:removed', handleMemberRemoved);
      socket.off('member:updated', handleMemberUpdated);
    };
  }, [workspaceId]);

  const fetchMembers = async () => {
    try {
      setError(null);
      const [membersRes, workspaceRes] = await Promise.all([
        api.get(`/workspaces/${workspaceId}/members`),
        api.get(`/workspaces/${workspaceId}`)
      ]);
      
      setMembers(membersRes.data.data);
      
      // Get max admins from owner's subscription
      const maxAdminsLimit = workspaceRes.data.subscription?.plan?.features?.maxAdmins || 1;
      setMaxAdmins(maxAdminsLimit);
      
      // Count current admins
      const adminCount = membersRes.data.data.filter((m: Member) => m.role === 'admin').length;
      setCurrentAdminCount(adminCount);
    } catch (error: any) {
      console.error('Failed to fetch members:', error);
      setError(error.response?.data?.message || 'Failed to load members');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    // Check if changing to admin and limit is reached
    if (newRole === 'admin') {
      const currentMember = members.find(m => m._id === userId);
      if (currentMember && currentMember.role !== 'admin') {
        // This would be a new admin
        if (maxAdmins !== -1 && currentAdminCount >= maxAdmins) {
          toast.error(`You've reached your admin limit (${maxAdmins}). Upgrade your plan to add more admins and expand your team's management capabilities.`);
          setShowUpgradeModal(true);
          return;
        }
      }
    }

    try {
      setUpdating(userId);
      setError(null);

      await api.patch(`/workspaces/${workspaceId}/members/${userId}`, {
        role: newRole,
      });

      // Update local state
      setMembers(
        members.map((member) =>
          member._id === userId ? { ...member, role: newRole as any } : member
        )
      );
      
      // Recalculate admin count
      const updatedMembers = members.map((member) =>
        member._id === userId ? { ...member, role: newRole as any } : member
      );
      const newAdminCount = updatedMembers.filter(m => m.role === 'admin').length;
      setCurrentAdminCount(newAdminCount);
      
      toast.success('Member role updated successfully');
    } catch (error: any) {
      console.error('Failed to update role:', error);
      const errorMessage = error.response?.data?.message || 'Failed to update role';
      toast.error(errorMessage);
      setError(errorMessage);
    } finally {
      setUpdating(null);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) {
      return;
    }

    try {
      setError(null);
      await api.delete(`/workspaces/${workspaceId}/members/${userId}`);
      setMembers(members.filter((member) => member._id !== userId));
    } catch (error: any) {
      console.error('Failed to remove member:', error);
      setError(error.response?.data?.message || 'Failed to remove member');
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    // Check member limit before inviting
    const currentMemberCount = members.length;
    if (!canInviteMember(currentMemberCount)) {
      setShowUpgradeModal(true);
      setShowInviteModal(false);
      return;
    }

    try {
      setInviting(true);
      setError(null);

      await api.post(`/workspaces/${workspaceId}/invites`, {
        email: inviteEmail.trim(),
        role: inviteRole,
      });

      // Show success message
      toast.success(`Invitation sent to ${inviteEmail}!`);
      setInviteEmail('');
      setInviteRole('member');
      setShowInviteModal(false);
      
      // Optionally refresh members list
      fetchMembers();
    } catch (error: any) {
      console.error('Failed to invite member:', error);
      
      // Check for member limit error from backend
      if (error.response?.data?.code === 'MEMBER_LIMIT_REACHED') {
        toast.error(error.response?.data?.message || 'Member limit reached. Please upgrade your plan.');
        setShowUpgradeModal(true);
        setShowInviteModal(false);
      } else {
        const errorMessage = error.response?.data?.message || 'Failed to invite member';
        toast.error(errorMessage);
        setError(errorMessage);
      }
    } finally {
      setInviting(false);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="w-4 h-4 text-yellow-500" />;
      case 'admin':
        return <Shield className="w-4 h-4 text-blue-500" />;
      case 'member':
        return <UserIcon className="w-4 h-4 text-green-500" />;
      case 'guest':
        return <Eye className="w-4 h-4 text-gray-500" />;
      default:
        return null;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'admin':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'member':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'guest':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-accent rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-muted-foreground" />
              </button>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-foreground">Workspace Members</h1>
                <p className="text-sm text-muted-foreground">{members.length} members</p>
              </div>
            </div>
            {can('invite_member') && (
              <Button
                onClick={() => setShowInviteModal(true)}
                className="flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 w-full sm:w-auto min-h-[44px]"
              >
                <UserPlus className="w-4 h-4" />
                Invite Member
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-destructive/10 border border-destructive/20 rounded-lg p-4">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Desktop Table View - Hidden on mobile */}
        <div className="hidden md:block bg-card rounded-xl shadow-sm border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]"></TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member._id}>
                  {/* Avatar */}
                  <TableCell>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-semibold">
                      {getInitials(member.name)}
                    </div>
                  </TableCell>

                  {/* Name */}
                  <TableCell className="font-medium text-card-foreground">
                    <div className="flex items-center gap-2">
                      {member.name}
                      {member.isOwner && (
                        <Crown className="w-4 h-4 text-yellow-500" />
                      )}
                    </div>
                  </TableCell>

                  {/* Email */}
                  <TableCell className="text-muted-foreground">{member.email}</TableCell>

                  {/* Role */}
                  <TableCell>
                    {isOwner() && !member.isOwner ? (
                      <Select
                        value={member.role}
                        onValueChange={(value) => handleRoleChange(member._id, value)}
                        disabled={updating === member._id}
                      >
                        <SelectTrigger className="w-[140px]">
                          {updating === member._id ? (
                            <div className="flex items-center gap-2">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Updating...</span>
                            </div>
                          ) : (
                            <SelectValue />
                          )}
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">
                            <div className="flex items-center gap-2">
                              <Shield className="w-4 h-4 text-blue-500" />
                              Admin
                            </div>
                          </SelectItem>
                          <SelectItem value="member">
                            <div className="flex items-center gap-2">
                              <UserIcon className="w-4 h-4 text-green-500" />
                              Member
                            </div>
                          </SelectItem>
                          <SelectItem value="guest">
                            <div className="flex items-center gap-2">
                              <Eye className="w-4 h-4 text-gray-500" />
                              Guest
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge
                        variant="outline"
                        className={`flex items-center gap-2 w-fit ${getRoleBadgeColor(
                          member.role
                        )}`}
                      >
                        {getRoleIcon(member.role)}
                        {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                      </Badge>
                    )}
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="text-right">
                    {can('remove_member') && !member.isOwner && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveMember(member._id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Card View - Visible only on mobile */}
        <div className="md:hidden space-y-4">
          {members.map((member) => (
            <div key={member._id} className="bg-card rounded-xl p-4 shadow-sm border border-border">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-semibold flex-shrink-0">
                  {getInitials(member.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-card-foreground truncate">{member.name}</h3>
                    {member.isOwner && (
                      <Crown className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{member.email}</p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                {isOwner() && !member.isOwner ? (
                  <Select
                    value={member.role}
                    onValueChange={(value) => handleRoleChange(member._id, value)}
                    disabled={updating === member._id}
                  >
                    <SelectTrigger className="flex-1">
                      {updating === member._id ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Updating...</span>
                        </div>
                      ) : (
                        <SelectValue />
                      )}
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4 text-blue-500" />
                          Admin
                        </div>
                      </SelectItem>
                      <SelectItem value="member">
                        <div className="flex items-center gap-2">
                          <UserIcon className="w-4 h-4 text-green-500" />
                          Member
                        </div>
                      </SelectItem>
                      <SelectItem value="guest">
                        <div className="flex items-center gap-2">
                          <Eye className="w-4 h-4 text-gray-500" />
                          Guest
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge
                    variant="outline"
                    className={`flex items-center gap-2 ${getRoleBadgeColor(member.role)}`}
                  >
                    {getRoleIcon(member.role)}
                    {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                  </Badge>
                )}

                {can('remove_member') && !member.isOwner && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveMember(member._id)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 min-h-[44px] min-w-[44px]"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Role Descriptions */}
        <div className="mt-8 bg-card rounded-xl shadow-sm border border-border p-6">
          <h3 className="text-lg font-semibold text-card-foreground mb-4">Role Permissions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex gap-3">
              <Crown className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-card-foreground">Owner</h4>
                <p className="text-sm text-muted-foreground">
                  Full control over workspace, can delete workspace and change member roles
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Shield className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-card-foreground">Admin</h4>
                <p className="text-sm text-muted-foreground">
                  Can create/delete spaces, invite/remove members, and manage settings
                </p>
                {maxAdmins !== -1 && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className={`text-xs font-medium px-2 py-1 rounded-full ${
                      currentAdminCount >= maxAdmins 
                        ? 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400' 
                        : 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                    }`}>
                      {currentAdminCount}/{maxAdmins} Admins
                    </div>
                    {currentAdminCount >= maxAdmins && (
                      <button
                        onClick={() => setShowUpgradeModal(true)}
                        className="text-xs text-purple-600 dark:text-purple-400 hover:underline"
                      >
                        Upgrade to add more
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-3">
              <UserIcon className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-card-foreground">Member</h4>
                <p className="text-sm text-muted-foreground">
                  Can create and manage lists, tasks, and update spaces
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Eye className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-card-foreground">Guest</h4>
                <p className="text-sm text-muted-foreground">
                  Read-only access to workspace content
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Invite Member Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-2xl p-4 sm:p-6 w-full max-w-md border border-border">
            <h3 className="text-lg sm:text-xl font-bold text-card-foreground mb-4">Invite Member</h3>

            {error && (
              <div className="mb-4 bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <form onSubmit={handleInviteMember}>
              <div className="space-y-4 mb-6">
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="user@example.com"
                    required
                    disabled={inviting}
                    className="min-h-[44px]"
                  />
                </div>

                <div>
                  <Label htmlFor="role">Role</Label>
                  <Select
                    value={inviteRole}
                    onValueChange={(value: any) => setInviteRole(value)}
                    disabled={inviting}
                  >
                    <SelectTrigger className="min-h-[44px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4 text-blue-500" />
                          Admin
                        </div>
                      </SelectItem>
                      <SelectItem value="member">
                        <div className="flex items-center gap-2">
                          <UserIcon className="w-4 h-4 text-green-500" />
                          Member
                        </div>
                      </SelectItem>
                      <SelectItem value="guest">
                        <div className="flex items-center gap-2">
                          <Eye className="w-4 h-4 text-gray-500" />
                          Guest
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowInviteModal(false);
                    setError(null);
                    setInviteEmail('');
                    setInviteRole('member');
                  }}
                  disabled={inviting}
                  className="flex-1 min-h-[44px]"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={inviting} className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 min-h-[44px]">
                  {inviting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Inviting...
                    </>
                  ) : (
                    'Invite'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        reason="member"
        currentCount={members.length}
        maxAllowed={5}
        workspaceName="Workspace"
        whatsappNumber={whatsappNumber}
      />
    </div>
  );
}
