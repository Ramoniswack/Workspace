'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/axios';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Search, Users } from 'lucide-react';
import { toast } from 'sonner';

interface ListMember {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
  workspaceRole: string;
  listPermissionLevel: string | null;
  hasOverride: boolean;
  addedBy: string | null;
  addedAt: string | null;
}

interface ListMemberManagementProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listId: string;
  listName: string;
}

export function ListMemberManagement({
  open,
  onOpenChange,
  listId,
  listName,
}: ListMemberManagementProps) {
  const [members, setMembers] = useState<ListMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (open) {
      fetchMembers();
    }
  }, [open, listId]);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/lists/${listId}/list-members`);
      setMembers(response.data.data);
    } catch (error) {
      console.error('Failed to fetch list members:', error);
      toast.error('Failed to load list members');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePermission = async (userId: string, permissionLevel: string) => {
    try {
      await api.patch(`/lists/${listId}/list-members/${userId}`, {
        permissionLevel,
      });
      toast.success('Permission updated successfully');
      fetchMembers();
    } catch (error) {
      console.error('Failed to update permission:', error);
      toast.error('Failed to update permission');
    }
  };

  const handleRemoveMember = async (userId: string) => {
    try {
      await api.delete(`/lists/${listId}/list-members/${userId}`);
      toast.success('Member removed from list');
      fetchMembers();
    } catch (error) {
      console.error('Failed to remove member:', error);
      toast.error('Failed to remove member');
    }
  };

  const handleAddMember = async (userId: string, permissionLevel: string = 'EDIT') => {
    try {
      await api.post(`/lists/${listId}/list-members`, {
        userId,
        permissionLevel,
      });
      
      // Send notification to the assigned member
      try {
        await api.post('/notifications', {
          recipientId: userId,
          type: 'list_assignment',
          title: 'Assigned to List',
          message: `You've been assigned to "${listName}"`,
          link: `/workspace/${listId}`, // Will be updated with proper workspace/space/list path
        });
      } catch (notifError) {
        console.error('Failed to send notification:', notifError);
      }
      
      toast.success('Member assigned to list');
      fetchMembers();
    } catch (error) {
      console.error('Failed to assign member:', error);
      toast.error('Failed to assign member');
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

  const getPermissionBadge = (member: ListMember) => {
    if (!member.hasOverride) {
      return (
        <Badge variant="outline" className="text-xs">
          Workspace: {member.workspaceRole}
        </Badge>
      );
    }

    const permissionColors: Record<string, string> = {
      FULL: 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400',
      EDIT: 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
      VIEW: 'bg-slate-100 text-slate-700 dark:bg-slate-900/20 dark:text-slate-400',
    };

    return (
      <Badge className={permissionColors[member.listPermissionLevel!] || ''}>
        {member.listPermissionLevel}
      </Badge>
    );
  };

  const filteredMembers = members.filter(
    (member) =>
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Separate members with and without overrides
  const membersWithAccess = filteredMembers.filter((m) => m.hasOverride);
  const membersWithoutAccess = filteredMembers.filter((m) => !m.hasOverride);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>List Permissions - {listName}</DialogTitle>
          <DialogDescription>
            Manage member permissions for this list.
            <br />
            <strong>Full Access:</strong> Create, edit, delete tasks
            <br />
            <strong>Can Edit:</strong> Create and edit tasks, change status
            <br />
            <strong>View Only:</strong> View tasks only
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search members..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Members List */}
        <div className="flex-1 overflow-y-auto space-y-6">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Loading members...</p>
            </div>
          ) : (
            <>
              {/* Members with List Access */}
              {membersWithAccess.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                    List Members ({membersWithAccess.length})
                  </h3>
                  <div className="space-y-2">
                    {membersWithAccess.map((member) => (
                      <div
                        key={member._id}
                        className="flex items-center justify-between p-3 bg-accent/50 rounded-lg hover:bg-accent transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={member.avatar} />
                            <AvatarFallback className="bg-blue-600 text-white text-sm">
                              {getInitials(member.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">{member.name}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {member.email}
                            </p>
                          </div>
                          {getPermissionBadge(member)}
                        </div>
                        <div className="flex items-center gap-2">
                          <Select
                            value={member.listPermissionLevel || 'EDIT'}
                            onValueChange={(value) => handleUpdatePermission(member._id, value)}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="FULL">Full Access</SelectItem>
                              <SelectItem value="EDIT">Can Edit</SelectItem>
                              <SelectItem value="VIEW">View Only</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveMember(member._id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Workspace Members without List Access */}
              {membersWithoutAccess.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                    Workspace Members ({membersWithoutAccess.length})
                  </h3>
                  <div className="space-y-2">
                    {membersWithoutAccess.map((member) => (
                      <div
                        key={member._id}
                        className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={member.avatar} />
                            <AvatarFallback className="bg-slate-600 text-white text-sm">
                              {getInitials(member.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">{member.name}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {member.email}
                            </p>
                          </div>
                          {getPermissionBadge(member)}
                        </div>
                        <div className="flex items-center gap-2">
                          <Select
                            defaultValue="EDIT"
                            onValueChange={(value) => handleAddMember(member._id, value)}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue placeholder="Assign to list" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="FULL">Full Access</SelectItem>
                              <SelectItem value="EDIT">Can Edit</SelectItem>
                              <SelectItem value="VIEW">View Only</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {filteredMembers.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No members found</p>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
