import { create } from 'zustand';

export interface List {
  _id: string;
  name: string;
  description?: string;
  space: string;
  folder?: string;
  workspace: string;
  status: string;
  type: 'list';
}

export interface Folder {
  _id: string;
  name: string;
  space: string;
  workspace: string;
  lists: List[];
  type: 'folder';
}

export interface Space {
  _id: string;
  name: string;
  description?: string;
  workspace: string;
  color?: string;
  icon?: string;
  status: string;
  members?: any[];
  folders: Folder[];
  listsWithoutFolder: List[];
  type: 'space';
}

export interface WorkspaceHierarchy {
  workspaceId: string;
  workspaceName: string;
  spaces: Space[];
}

interface WorkspaceStore {
  hierarchy: WorkspaceHierarchy | null;
  loading: boolean;
  error: string | null;
  
  // Actions
  setHierarchy: (hierarchy: WorkspaceHierarchy) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Optimistic updates
  addSpace: (space: Space) => void;
  updateSpace: (spaceId: string, updates: Partial<Space>) => void;
  deleteSpace: (spaceId: string) => void;
  
  addFolder: (spaceId: string, folder: Folder) => void;
  updateFolder: (spaceId: string, folderId: string, updates: Partial<Folder>) => void;
  deleteFolder: (spaceId: string, folderId: string) => void;
  
  addList: (spaceId: string, list: List, folderId?: string) => void;
  updateList: (spaceId: string, listId: string, updates: Partial<List>, folderId?: string) => void;
  deleteList: (spaceId: string, listId: string, folderId?: string) => void;
  
  // Clear store
  clear: () => void;
}

export const useWorkspaceStore = create<WorkspaceStore>((set) => ({
  hierarchy: null,
  loading: false,
  error: null,

  setHierarchy: (hierarchy) => set({ hierarchy, error: null }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  // Optimistic space updates
  addSpace: (space) =>
    set((state) => {
      if (!state.hierarchy) return state;
      return {
        hierarchy: {
          ...state.hierarchy,
          spaces: [...state.hierarchy.spaces, space],
        },
      };
    }),

  updateSpace: (spaceId, updates) =>
    set((state) => {
      if (!state.hierarchy) return state;
      return {
        hierarchy: {
          ...state.hierarchy,
          spaces: state.hierarchy.spaces.map((space) =>
            space._id === spaceId ? { ...space, ...updates } : space
          ),
        },
      };
    }),

  deleteSpace: (spaceId) =>
    set((state) => {
      if (!state.hierarchy) return state;
      return {
        hierarchy: {
          ...state.hierarchy,
          spaces: state.hierarchy.spaces.filter((space) => space._id !== spaceId),
        },
      };
    }),

  // Optimistic folder updates
  addFolder: (spaceId, folder) =>
    set((state) => {
      if (!state.hierarchy) return state;
      return {
        hierarchy: {
          ...state.hierarchy,
          spaces: state.hierarchy.spaces.map((space) =>
            space._id === spaceId
              ? { ...space, folders: [...space.folders, folder] }
              : space
          ),
        },
      };
    }),

  updateFolder: (spaceId, folderId, updates) =>
    set((state) => {
      if (!state.hierarchy) return state;
      return {
        hierarchy: {
          ...state.hierarchy,
          spaces: state.hierarchy.spaces.map((space) =>
            space._id === spaceId
              ? {
                  ...space,
                  folders: space.folders.map((folder) =>
                    folder._id === folderId ? { ...folder, ...updates } : folder
                  ),
                }
              : space
          ),
        },
      };
    }),

  deleteFolder: (spaceId, folderId) =>
    set((state) => {
      if (!state.hierarchy) return state;
      return {
        hierarchy: {
          ...state.hierarchy,
          spaces: state.hierarchy.spaces.map((space) =>
            space._id === spaceId
              ? {
                  ...space,
                  folders: space.folders.filter((folder) => folder._id !== folderId),
                }
              : space
          ),
        },
      };
    }),

  // Optimistic list updates
  addList: (spaceId, list, folderId) =>
    set((state) => {
      if (!state.hierarchy) return state;
      return {
        hierarchy: {
          ...state.hierarchy,
          spaces: state.hierarchy.spaces.map((space) => {
            if (space._id !== spaceId) return space;

            if (folderId) {
              // Add to folder
              return {
                ...space,
                folders: space.folders.map((folder) =>
                  folder._id === folderId
                    ? { ...folder, lists: [...folder.lists, list] }
                    : folder
                ),
              };
            } else {
              // Add to standalone lists
              return {
                ...space,
                listsWithoutFolder: [...space.listsWithoutFolder, list],
              };
            }
          }),
        },
      };
    }),

  updateList: (spaceId, listId, updates, folderId) =>
    set((state) => {
      if (!state.hierarchy) return state;
      return {
        hierarchy: {
          ...state.hierarchy,
          spaces: state.hierarchy.spaces.map((space) => {
            if (space._id !== spaceId) return space;

            if (folderId) {
              // Update in folder
              return {
                ...space,
                folders: space.folders.map((folder) =>
                  folder._id === folderId
                    ? {
                        ...folder,
                        lists: folder.lists.map((list) =>
                          list._id === listId ? { ...list, ...updates } : list
                        ),
                      }
                    : folder
                ),
              };
            } else {
              // Update in standalone lists
              return {
                ...space,
                listsWithoutFolder: space.listsWithoutFolder.map((list) =>
                  list._id === listId ? { ...list, ...updates } : list
                ),
              };
            }
          }),
        },
      };
    }),

  deleteList: (spaceId, listId, folderId) =>
    set((state) => {
      if (!state.hierarchy) return state;
      return {
        hierarchy: {
          ...state.hierarchy,
          spaces: state.hierarchy.spaces.map((space) => {
            if (space._id !== spaceId) return space;

            if (folderId) {
              // Delete from folder
              return {
                ...space,
                folders: space.folders.map((folder) =>
                  folder._id === folderId
                    ? {
                        ...folder,
                        lists: folder.lists.filter((list) => list._id !== listId),
                      }
                    : folder
                ),
              };
            } else {
              // Delete from standalone lists
              return {
                ...space,
                listsWithoutFolder: space.listsWithoutFolder.filter(
                  (list) => list._id !== listId
                ),
              };
            }
          }),
        },
      };
    }),

  clear: () => set({ hierarchy: null, loading: false, error: null }),
}));
