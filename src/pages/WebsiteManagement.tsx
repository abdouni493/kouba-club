import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Globe, Plus, Pencil, Trash2, Image as ImageIcon, Share2, Save, Upload } from 'lucide-react';
import { PageHeader, Badge, EmptyState, useConfirm, Tabs } from '../components/ui/Display';
import Modal from '../components/ui/Modal';
import { Input, Textarea } from '../components/ui/Fields';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { usePermissions } from '../lib/permissions';
import { uploadImage } from '../lib/storage';
import { uid } from '../lib/utils';
import type { Activity } from '../lib/types';

export const GRADIENTS: Record<string, string> = {
  'grad-1': 'linear-gradient(135deg,#ff5a00,#ffb900)',
  'grad-2': 'linear-gradient(135deg,#eb3700,#ff5a00)',
  'grad-3': 'linear-gradient(135deg,#121214,#ff5a00)',
  'grad-4': 'linear-gradient(135deg,#ff5a00,#facc15)',
  'grad-5': 'linear-gradient(135deg,#2e1a05,#ffb900)',
  'grad-6': 'linear-gradient(135deg,#eb3700,#121214)',
};

export function activityBg(image: string) {
  if (GRADIENTS[image]) return GRADIENTS[image];
  if (image?.startsWith('http') || image?.startsWith('data:')) return `url(${image}) center/cover`;
  return GRADIENTS['grad-1'];
}

const emptyAct = { name: '', description: '', image: 'grad-1' };

export default function WebsiteManagement() {
  const { t } = useTranslation();
  const { data, add, updateItem, remove, patch } = useData();
  const { toast } = useToast();
  const confirm = useConfirm();
  const { canDo } = usePermissions();

  const [tab, setTab] = useState('activities');
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyAct);
  const [contact, setContact] = useState(data.contact);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setContact(data.contact);
  }, [data.contact]);

  const onImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImage('activity-images', file);
      setForm((f) => ({ ...f, image: url }));
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erreur de téléversement', 'error');
    } finally {
      setUploading(false);
    }
  };

  const openCreate = () => { setEditId(null); setForm(emptyAct); setOpen(true); };
  const openEdit = (a: Activity) => { setEditId(a.id); setForm({ name: a.name, description: a.description, image: a.image }); setOpen(true); };
  const save = () => {
    if (!form.name) { toast('Nom requis', 'error'); return; }
    if (editId) { updateItem('activities', editId, form); toast('Activité mise à jour', 'success'); }
    else { add('activities', { id: uid('act'), ...form }); toast('Activité créée', 'success'); }
    setOpen(false);
  };
  const saveContact = () => { patch({ contact }); toast('Contact enregistré', 'success'); };

  return (
    <div>
      <PageHeader title={t('website.title')} icon={<Globe className="h-5 w-5" />}
        actions={tab === 'activities' && canDo('website', 'activities') && <button onClick={openCreate} className="btn-primary"><Plus className="h-4 w-4" />{t('website.newActivity')}</button>} />

      <div className="mb-5"><Tabs active={tab} onChange={setTab} tabs={[
        { key: 'activities', label: t('website.activities'), icon: <ImageIcon className="h-4 w-4" /> },
        { key: 'contact', label: t('website.contact'), icon: <Share2 className="h-4 w-4" /> },
      ]} /></div>

      {tab === 'activities' && (
        data.activities.length === 0 ? <EmptyState title="Aucune activité" icon={<ImageIcon className="h-7 w-7" />} /> : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.activities.map((a, i) => (
              <motion.div key={a.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="card card-hover overflow-hidden">
                <div className="h-40 relative" style={{ background: activityBg(a.image) }}>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  <div className="absolute bottom-3 left-4"><Badge tone="accent" className="!bg-black/40 !text-white backdrop-blur">Activité</Badge></div>
                </div>
                <div className="p-5">
                  <h3 className="font-display font-bold text-fg">{a.name}</h3>
                  <p className="text-sm text-muted mt-1 line-clamp-2">{a.description}</p>
                  {canDo('website', 'activities') && (
                    <div className="flex gap-2 mt-4">
                      <button onClick={() => openEdit(a)} className="btn-ghost flex-1 !py-2"><Pencil className="h-4 w-4" />{t('common.edit')}</button>
                      <button onClick={() => confirm.ask(() => { remove('activities', a.id); toast('Supprimé', 'info'); }, 'Supprimer cette activité ?')} className="btn-icon hover:text-danger"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )
      )}

      {tab === 'contact' && (
        <div className="card p-6 max-w-2xl">
          <div className="grid sm:grid-cols-2 gap-4">
            <Input label="Facebook" value={contact.facebook} onChange={(e) => setContact({ ...contact, facebook: e.target.value })} placeholder="https://facebook.com/..." />
            <Input label="Instagram" value={contact.instagram} onChange={(e) => setContact({ ...contact, instagram: e.target.value })} placeholder="https://instagram.com/..." />
            <Input label="TikTok" value={contact.tiktok} onChange={(e) => setContact({ ...contact, tiktok: e.target.value })} placeholder="https://tiktok.com/@..." />
            <Input label={t('website.map')} value={contact.map} onChange={(e) => setContact({ ...contact, map: e.target.value })} placeholder="https://maps.google.com/..." />
            <Input label={t('common.phone')} value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} />
            <Input label={t('website.whatsapp')} value={contact.whatsapp} onChange={(e) => setContact({ ...contact, whatsapp: e.target.value })} placeholder="213..." />
            <div className="sm:col-span-2"><Input label={t('common.email')} type="email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} /></div>
          </div>
          {canDo('website', 'contact') && <button onClick={saveContact} className="btn-primary mt-5"><Save className="h-4 w-4" />{t('common.save')}</button>}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} size="lg" title={editId ? 'Modifier activité' : t('website.newActivity')}
        footer={<><button onClick={() => setOpen(false)} className="btn-ghost">{t('common.cancel')}</button><button onClick={save} className="btn-primary">{t('common.save')}</button></>}>
        <div className="space-y-4">
          <Input label={t('common.name')} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Textarea label={t('common.description')} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div>
            <label className="label">{t('website.image')}</label>
            <div className="grid grid-cols-6 gap-2 mb-3">
              {Object.entries(GRADIENTS).map(([k, g]) => (
                <button key={k} onClick={() => setForm({ ...form, image: k })} style={{ background: g }}
                  className={`h-12 rounded-lg transition-all ${form.image === k ? 'ring-2 ring-accent ring-offset-2 ring-offset-surface scale-105' : 'opacity-80 hover:opacity-100'}`} />
              ))}
            </div>
            <div className="flex gap-2 items-start">
              <div className="flex-1">
                <Input placeholder="Ou collez une URL d'image (https://…)" value={form.image.startsWith('http') ? form.image : ''} onChange={(e) => setForm({ ...form, image: e.target.value || 'grad-1' })} />
              </div>
              <label className="btn-ghost cursor-pointer shrink-0">
                <Upload className="h-4 w-4" />{uploading ? 'Envoi…' : 'Téléverser'}
                <input type="file" accept="image/*" className="hidden" onChange={onImageFile} disabled={uploading} />
              </label>
            </div>
          </div>
          <div className="h-32 rounded-xl" style={{ background: activityBg(form.image) }} />
        </div>
      </Modal>

      {confirm.node}
    </div>
  );
}
