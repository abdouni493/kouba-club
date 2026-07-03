import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Receipt, Plus, Pencil, Trash2, Calendar, Tag } from 'lucide-react';
import { PageHeader, Badge, EmptyState, useConfirm, StatCard } from '../components/ui/Display';
import Modal from '../components/ui/Modal';
import { Input, Textarea, CreatableSelect, Select } from '../components/ui/Fields';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { useLookups } from '../lib/selectors';
import { usePermissions } from '../lib/permissions';
import { money, uid, today, fmtDate } from '../lib/utils';
import type { Expense } from '../lib/types';

const empty = { name: '', categoryId: '', description: '', amount: 0, date: today() };

export default function Expenses() {
  const { t } = useTranslation();
  const { data, add, updateItem, remove } = useData();
  const { toast } = useToast();
  const L = useLookups();
  const confirm = useConfirm();
  const { canDo } = usePermissions();

  const [form, setForm] = useState(empty);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [filterCat, setFilterCat] = useState('');

  const openCreate = () => { setEditId(null); setForm(empty); setOpen(true); };
  const openEdit = (e: Expense) => { setEditId(e.id); setForm({ name: e.name, categoryId: e.categoryId, description: e.description, amount: e.amount, date: e.date }); setOpen(true); };
  const save = () => {
    if (!form.name || form.amount <= 0) { toast('Nom et montant requis', 'error'); return; }
    if (editId) { updateItem('expenses', editId, form); toast('Dépense mise à jour', 'success'); }
    else { add('expenses', { id: uid('ex'), ...form }); toast('Dépense ajoutée', 'success'); }
    setOpen(false);
  };

  const list = data.expenses.filter((e) => !filterCat || e.categoryId === filterCat).sort((a, b) => b.date.localeCompare(a.date));
  const total = list.reduce((s, e) => s + e.amount, 0);

  return (
    <div>
      <PageHeader title={t('expenses.title')} subtitle={`${data.expenses.length} dépenses`} icon={<Receipt className="h-5 w-5" />}
        actions={<button onClick={openCreate} className="btn-primary"><Plus className="h-4 w-4" />{t('expenses.newExpense')}</button>} />

      <div className="grid sm:grid-cols-3 gap-4 mb-5">
        <StatCard label={t('common.total')} value={money(total)} icon={<Receipt className="h-5 w-5" />} tone="danger" />
        <StatCard label="Dépenses" value={list.length} icon={<Tag className="h-5 w-5" />} tone="muted" />
        <div className="card p-5 flex flex-col justify-center">
          <Select label={t('expenses.category')} value={filterCat} onChange={setFilterCat} placeholder={t('common.all')} options={data.expenseCategories.map((c) => ({ value: c.id, label: c.name }))} />
        </div>
      </div>

      {list.length === 0 ? <EmptyState title="Aucune dépense" icon={<Receipt className="h-7 w-7" />} /> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map((e, i) => (
            <motion.div key={e.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="card card-hover p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0"><h3 className="font-display font-bold text-fg truncate">{e.name}</h3><Badge tone="accent" className="mt-1">{L.ecName(e.categoryId)}</Badge></div>
                <span className="font-display text-lg font-extrabold text-danger shrink-0">-{money(e.amount)}</span>
              </div>
              {e.description && <p className="text-sm text-muted mt-3 line-clamp-2">{e.description}</p>}
              <p className="text-xs text-faint mt-2 flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{fmtDate(e.date)}</p>
              <div className="flex gap-2 mt-4 pt-4 border-t border-line/10">
                {canDo('expenses', 'edit') && <button onClick={() => openEdit(e)} className="btn-ghost flex-1 !py-2"><Pencil className="h-4 w-4" />{t('common.edit')}</button>}
                {canDo('expenses', 'delete') && <button onClick={() => confirm.ask(() => { remove('expenses', e.id); toast('Supprimé', 'info'); }, 'Supprimer cette dépense ?')} className="btn-icon hover:text-danger"><Trash2 className="h-4 w-4" /></button>}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} size="lg" title={editId ? 'Modifier dépense' : t('expenses.newExpense')}
        footer={<><button onClick={() => setOpen(false)} className="btn-ghost">{t('common.cancel')}</button><button onClick={save} className="btn-primary">{t('common.save')}</button></>}>
        <div className="grid sm:grid-cols-2 gap-4">
          <Input label={t('common.name')} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <CreatableSelect label={t('expenses.category')} value={form.categoryId} onChange={(v) => setForm({ ...form, categoryId: v })}
            options={data.expenseCategories.map((c) => ({ value: c.id, label: c.name }))}
            onCreate={(name) => { const id = uid('ec'); add('expenseCategories', { id, name }); return id; }} createLabel={t('expenses.newCategory')} />
          <Input label={t('common.amount')} type="number" value={form.amount || ''} onChange={(e) => setForm({ ...form, amount: +e.target.value })} required />
          <Input label={t('common.date')} type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          <div className="sm:col-span-2"><Textarea label={t('common.description')} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        </div>
      </Modal>

      {confirm.node}
    </div>
  );
}
