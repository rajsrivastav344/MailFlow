'use client';

import { useState, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'react-hot-toast';
import {
  Plus, Search, Upload, Download, Trash2, Pencil, Users, X, Loader2, Filter,
} from 'lucide-react';
import { contactsApi } from '@/lib/api';
import { contactSchema, type ContactSchema } from '@/lib/validations';
import { formatDate, cn, debounce } from '@/lib/utils';
import type { Contact } from '@/types';

function ContactModal({
  contact,
  groups,
  onClose,
}: {
  contact: Contact | null;
  groups: string[];
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ContactSchema>({
    resolver: zodResolver(contactSchema),
    defaultValues: contact ? { 
      name: contact.name, 
      email: contact.email, 
      group: contact.group_name || ''  // FIXED: Use group_name
    } : {},
  });

const mutation = useMutation({
  mutationFn: (data: ContactSchema) => {
    // Map the form data to what the backend expects
    const payload = {
      name: data.name,
      email: data.email,
      group_name: data.group,  // Map 'group' to 'group_name'
    };
    
    return contact 
      ? contactsApi.update(contact.id, payload) 
      : contactsApi.create(payload);
  },
  onSuccess: () => {
    qc.invalidateQueries({ queryKey: ['contacts'] });
    qc.invalidateQueries({ queryKey: ['contact-groups'] });
    toast.success(contact ? 'Contact updated' : 'Contact created');
    onClose();
  },
  onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to save contact'),
});
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="card w-full max-w-md shadow-modal animate-slide-up mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-surface-100">
          <h2 className="font-display font-bold text-ink">{contact ? 'Edit Contact' : 'Add Contact'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-100 text-ink-muted">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">Full Name</label>
            <input {...register('name')} className={cn('input', errors.name && 'border-red-300')} placeholder="John Doe" />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">Email Address</label>
            <input {...register('email')} type="email" className={cn('input', errors.email && 'border-red-300')} placeholder="john@example.com" />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">Group (optional)</label>
            <input {...register('group')} className="input" placeholder="e.g. Newsletter, VIP" list="groups-list" />
            <datalist id="groups-list">
              {groups.map((g) => <option key={g} value={g} />)}
            </datalist>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary">
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : contact ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ContactsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [groupFilter, setGroupFilter] = useState('');
  const [modalContact, setModalContact] = useState<Contact | null | 'new'>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const debouncedSet = useCallback(debounce((v: string) => {
    setDebouncedSearch(v);
    setPage(1);
  }, 400), []);

  const handleSearch = (v: string) => {
    setSearch(v);
    debouncedSet(v);
  };

  const { data, isLoading } = useQuery({
    queryKey: ['contacts', page, debouncedSearch, groupFilter],
    queryFn: () => contactsApi.getAll({ page, limit: 20, search: debouncedSearch || undefined, group: groupFilter || undefined }),
  });

  const { data: groupsData } = useQuery({
    queryKey: ['contact-groups'],
    queryFn: contactsApi.getGroups,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => contactsApi.delete(id), // FIXED: Changed from number to string
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contacts'] });
      toast.success('Contact deleted');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to delete'),
  });

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    const toastId = toast.loading('Importing contacts...');
    try {
      await contactsApi.importCsv(formData);
      qc.invalidateQueries({ queryKey: ['contacts'] });
      toast.success('Contacts imported!', { id: toastId });
    } catch {
      toast.error('Import failed', { id: toastId });
    }
    e.target.value = '';
  };

  const handleExport = async () => {
    const toastId = toast.loading('Preparing export...');
    try {
      const res = await contactsApi.exportCsv();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'contacts.csv';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Exported!', { id: toastId });
    } catch {
      toast.error('Export failed', { id: toastId });
    }
  };

  const groups = groupsData?.groups?.map((g) => g.name) ?? [];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div />
        <div className="flex items-center gap-2 flex-wrap">
          <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleImport} />
          <button onClick={() => fileInputRef.current?.click()} className="btn-secondary">
            <Upload className="w-4 h-4" /> Import CSV
          </button>
          <button onClick={handleExport} className="btn-secondary">
            <Download className="w-4 h-4" /> Export
          </button>
          <button onClick={() => setModalContact('new')} className="btn-primary">
            <Plus className="w-4 h-4" /> Add Contact
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-faint" />
          <input
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="input pl-9"
            placeholder="Search contacts..."
          />
        </div>
        <div className="relative sm:w-48">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-faint" />
          <select
            value={groupFilter}
            onChange={(e) => { setGroupFilter(e.target.value); setPage(1); }}
            className="input pl-9 appearance-none"
          >
            <option value="">All groups</option>
            {groups.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-200 bg-surface-50">
                <th className="text-left text-xs font-semibold text-ink-muted uppercase tracking-wider px-6 py-3.5">Name</th>
                <th className="text-left text-xs font-semibold text-ink-muted uppercase tracking-wider px-6 py-3.5">Email</th>
                <th className="text-left text-xs font-semibold text-ink-muted uppercase tracking-wider px-6 py-3.5 hidden md:table-cell">Group</th>
                <th className="text-left text-xs font-semibold text-ink-muted uppercase tracking-wider px-6 py-3.5 hidden lg:table-cell">Added</th>
                <th className="w-24 px-6 py-3.5" />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-surface-100">
                    <td className="px-6 py-4"><div className="h-4 w-32 bg-surface-200 rounded animate-pulse" /></td>
                    <td className="px-6 py-4"><div className="h-4 w-48 bg-surface-200 rounded animate-pulse" /></td>
                    <td className="px-6 py-4 hidden md:table-cell"><div className="h-4 w-20 bg-surface-200 rounded animate-pulse" /></td>
                    <td className="px-6 py-4 hidden lg:table-cell"><div className="h-4 w-24 bg-surface-200 rounded animate-pulse" /></td>
                    <td className="px-6 py-4" />
                  </tr>
                ))
              ) : !data?.data?.length ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 bg-surface-100 rounded-xl flex items-center justify-center">
                        <Users className="w-5 h-5 text-ink-faint" />
                      </div>
                      <p className="font-medium text-ink">No contacts found</p>
                      <p className="text-sm text-ink-muted">Add contacts manually or import a CSV file</p>
                    </div>
                  </td>
                </tr>
              ) : (
                data.data.map((contact) => (
                  <tr key={contact.id} className="table-row">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-brand-100 rounded-full flex items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-brand-700">{contact.name.charAt(0).toUpperCase()}</span>
                        </div>
                        <span className="text-sm font-medium text-ink">{contact.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-ink-muted">{contact.email}</td>
                    <td className="px-6 py-4 hidden md:table-cell">
                      {contact.group_name ? (  // FIXED: Use group_name
                        <span className="badge bg-brand-50 text-brand-700 border-brand-200">{contact.group_name}</span>
                      ) : (
                        <span className="text-ink-faint text-sm">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-ink-faint hidden lg:table-cell">
                      {formatDate(contact.created_at)}  {/* FIXED: Use created_at, not createdAt */}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => setModalContact(contact)}
                          className="p-1.5 rounded-lg hover:bg-surface-100 text-ink-muted hover:text-ink transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Delete this contact?')) deleteMutation.mutate(contact.id);
                          }}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-ink-muted hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-surface-100">
            <p className="text-sm text-ink-muted">
              {data.total} contacts · page {page} of {data.totalPages}
            </p>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary py-1.5 px-3 text-xs">Previous</button>
              <button onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))} disabled={page === data.totalPages} className="btn-secondary py-1.5 px-3 text-xs">Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {modalContact !== null && (
        <ContactModal
          contact={modalContact === 'new' ? null : modalContact}
          groups={groups}
          onClose={() => setModalContact(null)}
        />
      )}
    </div>
  );
}