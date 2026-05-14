import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Trash2, Edit2, Download, FileText, Video,
  Link2, BookOpen, File, Image as ImageIcon, Archive, Code,
  Upload, X, Check, AlertCircle
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Alert } from '../ui/Alert';
import { EmptyState } from '../ui/EmptyState';
import { Spinner } from '../ui/Spinner';
import { apiRequest } from '../../lib/api';
import toast from 'react-hot-toast';

type Material = {
  title: string;
  url: string;
  type: string;
  description?: string;
  category?: string;
  size?: string;
  uploadedAt?: string;
};

type MaterialsManagerProps = {
  materials: Material[];
  isLoading?: boolean;
  onAdd: (material: Omit<Material, 'uploadedAt'>) => Promise<void>;
  onEdit: (index: number, material: Omit<Material, 'uploadedAt'>) => Promise<void>;
  onRemove: (index: number) => Promise<void>;
  canEdit?: boolean;
};

const MATERIAL_TYPES = [
  { value: 'pdf', label: 'PDF Document', icon: FileText, color: '#ef4444' },
  { value: 'video', label: 'Video', icon: Video, color: '#8b5cf6' },
  { value: 'link', label: 'Web Link', icon: Link2, color: '#3b82f6' },
  { value: 'slides', label: 'Presentation', icon: BookOpen, color: '#f59e0b' },
  { value: 'code', label: 'Code/Repository', icon: Code, color: '#10b981' },
  { value: 'image', label: 'Image', icon: ImageIcon, color: '#ec4899' },
  { value: 'archive', label: 'Archive/ZIP', icon: Archive, color: '#6366f1' },
  { value: 'other', label: 'Other', icon: File, color: '#64748b' },
];

const CATEGORIES = [
  'Lecture Notes',
  'Slides',
  'Code Examples',
  'Assignments',
  'Resources',
  'Recordings',
  'Other',
];

function getMaterialIcon(type: string) {
  const found = MATERIAL_TYPES.find(t => t.value === type);
  return found || MATERIAL_TYPES[MATERIAL_TYPES.length - 1];
}

export function MaterialsManager({
  materials,
  isLoading,
  onAdd,
  onEdit,
  onRemove,
  canEdit = true,
}: MaterialsManagerProps) {
  const [showForm, setShowForm] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [formData, setFormData] = useState<Omit<Material, 'uploadedAt'>>({
    title: '',
    url: '',
    type: 'link',
    description: '',
    category: 'Resources',
    size: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [uploadMode, setUploadMode] = useState<'url' | 'file'>('url');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const resetForm = () => {
    setFormData({
      title: '',
      url: '',
      type: 'link',
      description: '',
      category: 'Resources',
      size: '',
    });
    setShowForm(false);
    setEditIndex(null);
    setUploadMode('url');
    setSelectedFile(null);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Auto-fill title if empty
      if (!formData.title) {
        setFormData(f => ({ ...f, title: file.name }));
      }
      // Auto-detect type
      const ext = file.name.split('.').pop()?.toLowerCase();
      let detectedType = 'other';
      if (ext === 'pdf') detectedType = 'pdf';
      else if (['mp4', 'avi', 'mov', 'webm'].includes(ext || '')) detectedType = 'video';
      else if (['jpg', 'jpeg', 'png', 'gif', 'svg'].includes(ext || '')) detectedType = 'image';
      else if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext || '')) detectedType = 'archive';
      else if (['ppt', 'pptx', 'key'].includes(ext || '')) detectedType = 'slides';
      
      setFormData(f => ({ 
        ...f, 
        type: detectedType,
        size: `${(file.size / 1024 / 1024).toFixed(2)} MB`
      }));
    }
  };

  const uploadFile = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('document', file);
    
    // Use apiRequest utility which handles authentication automatically
    const result = await apiRequest<{ url: string }>('/upload/document', {
      method: 'POST',
      body: formData,
      isFormData: true, // Important: tells apiRequest not to set Content-Type header
    });

    return result.url;
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      toast.error('Title is required');
      return;
    }

    if (uploadMode === 'url' && !formData.url.trim()) {
      toast.error('URL is required');
      return;
    }

    if (uploadMode === 'file' && !selectedFile && editIndex === null) {
      toast.error('Please select a file');
      return;
    }

    setSubmitting(true);
    try {
      let finalUrl = formData.url;

      // Upload file if in file mode and a file is selected
      if (uploadMode === 'file' && selectedFile) {
        setUploading(true);
        finalUrl = await uploadFile(selectedFile);
        setUploading(false);
      }

      const materialData = {
        ...formData,
        url: finalUrl,
      };

      if (editIndex !== null) {
        await onEdit(editIndex, materialData);
        toast.success('Material updated');
      } else {
        await onAdd(materialData);
        toast.success('Material added');
      }
      resetForm();
    } catch (error) {
      toast.error(uploading ? 'File upload failed' : 'Failed to save material');
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  const handleEdit = (index: number) => {
    const material = materials[index];
    setFormData({
      title: material.title,
      url: material.url,
      type: material.type,
      description: material.description || '',
      category: material.category || 'Resources',
      size: material.size || '',
    });
    setEditIndex(index);
    setShowForm(true);
  };

  const handleRemove = async (index: number) => {
    if (!window.confirm('Remove this material?')) return;
    try {
      await onRemove(index);
      toast.success('Material removed');
    } catch (error) {
      toast.error('Failed to remove material');
    }
  };

  const handleOpenMaterial = (material: Material) => {
    // Check if it's a base64 data URL
    if (material.url.startsWith('data:')) {
      // For base64 data URLs, download the file instead of navigating
      const link = document.createElement('a');
      link.href = material.url;
      link.download = material.title || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // For regular URLs, open in new tab
      window.open(material.url, '_blank', 'noopener,noreferrer');
    }
  };

  const filteredMaterials = categoryFilter === 'all'
    ? materials
    : materials.filter(m => m.category === categoryFilter);

  const categories = Array.from(new Set(materials.map(m => m.category).filter(Boolean)));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header with Add Button */}
      {canEdit && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h3 style={{ margin: '0 0 4px', fontSize: '1.1rem', fontWeight: 700, color: 'var(--text)' }}>
              Workshop Materials
            </h3>
            <p className="ui-text-sm ui-text-muted">
              Share resources with approved participants
            </p>
          </div>
          <Button leftIcon={Plus} onClick={() => setShowForm(true)}>
            Add Material
          </Button>
        </div>
      )}

      {/* Info Alert */}
      {canEdit && (
        <Alert variant="info">
          <AlertCircle size={16} />
          Materials are only visible to participants with <strong>Approved</strong> or <strong>Attended</strong> status.
        </Alert>
      )}

      {/* Category Filter */}
      {categories.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <span className="ui-text-sm ui-text-muted">Filter:</span>
          <button
            onClick={() => setCategoryFilter('all')}
            style={{
              padding: '6px 14px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: categoryFilter === 'all' ? 'var(--accent)' : 'var(--surface)',
              color: categoryFilter === 'all' ? '#fff' : 'var(--text)',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            All ({materials.length})
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat!)}
              style={{
                padding: '6px 14px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: categoryFilter === cat ? 'var(--accent)' : 'var(--surface)',
                color: categoryFilter === cat ? '#fff' : 'var(--text)',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {cat} ({materials.filter(m => m.category === cat).length})
            </button>
          ))}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
          <Spinner size="lg" label="Loading materials..." />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredMaterials.length === 0 && (
        <div className="ui-card">
          <EmptyState
            icon={BookOpen}
            title={categoryFilter === 'all' ? 'No materials yet' : `No materials in ${categoryFilter}`}
            description={canEdit ? 'Add PDFs, videos, or links for participants' : 'Materials will appear here once added'}
            size="sm"
            action={canEdit && categoryFilter === 'all' ? (
              <Button leftIcon={Plus} onClick={() => setShowForm(true)}>
                Add First Material
              </Button>
            ) : undefined}
          />
        </div>
      )}

      {/* Materials Grid */}
      {!isLoading && filteredMaterials.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {filteredMaterials.map((material, index) => {
            const actualIndex = materials.indexOf(material);
            const typeInfo = getMaterialIcon(material.type);
            const Icon = typeInfo.icon;

            return (
              <motion.div
                key={actualIndex}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="ui-card"
                style={{
                  padding: 0,
                  overflow: 'hidden',
                  transition: 'all 0.2s',
                  cursor: 'pointer',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'var(--shadow)';
                }}
              >
                {/* Header with Icon */}
                <div
                  style={{
                    padding: '20px 20px 16px',
                    background: `linear-gradient(135deg, ${typeInfo.color}15, ${typeInfo.color}05)`,
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 12,
                        background: typeInfo.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        flexShrink: 0,
                      }}
                    >
                      <Icon size={24} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h4
                        style={{
                          margin: '0 0 4px',
                          fontSize: '0.95rem',
                          fontWeight: 700,
                          color: 'var(--text)',
                          lineHeight: 1.3,
                        }}
                      >
                        {material.title}
                      </h4>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <Badge variant="neutral" style={{ fontSize: '0.7rem' }}>
                          {typeInfo.label}
                        </Badge>
                        {material.category && (
                          <Badge variant="primary" style={{ fontSize: '0.7rem' }}>
                            {material.category}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Body */}
                <div style={{ padding: '16px 20px' }}>
                  {material.description && (
                    <p
                      style={{
                        margin: '0 0 12px',
                        fontSize: '0.85rem',
                        color: 'var(--muted)',
                        lineHeight: 1.5,
                      }}
                    >
                      {material.description}
                    </p>
                  )}

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 12px',
                      background: 'var(--surface)',
                      borderRadius: 8,
                      marginBottom: 12,
                    }}
                  >
                    <Link2 size={14} style={{ color: 'var(--muted)', flexShrink: 0 }} />
                    <span
                      className="ui-text-xs ui-truncate"
                      style={{
                        color: 'var(--accent)',
                        flex: 1,
                      }}
                    >
                      {material.url.startsWith('data:') ? 'Uploaded File (Base64)' : material.url}
                    </span>
                  </div>

                  {material.size && (
                    <p className="ui-text-xs ui-text-muted" style={{ marginBottom: 12 }}>
                      Size: {material.size}
                    </p>
                  )}

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Button 
                      variant="primary" 
                      size="sm" 
                      leftIcon={Download} 
                      fullWidth
                      onClick={e => {
                        e.stopPropagation();
                        handleOpenMaterial(material);
                      }}
                    >
                      {material.url.startsWith('data:') ? 'Download' : 'Open'}
                    </Button>
                    {canEdit && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          leftIcon={Edit2}
                          onClick={e => {
                            e.stopPropagation();
                            handleEdit(actualIndex);
                          }}
                        />
                        <Button
                          variant="danger"
                          size="sm"
                          leftIcon={Trash2}
                          onClick={e => {
                            e.stopPropagation();
                            handleRemove(actualIndex);
                          }}
                        />
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Material Modal */}
      <AnimatePresence>
        {showForm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.6)',
                backdropFilter: 'blur(6px)',
                zIndex: 1040,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'flex-start',
                paddingTop: '40px',
                overflowY: 'auto',
              }}
              onClick={resetForm}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                onClick={e => e.stopPropagation()}
                style={{
                  width: '90%',
                  maxWidth: 600,
                  maxHeight: 'calc(100vh - 80px)',
                  display: 'flex',
                  flexDirection: 'column',
                  background: 'var(--panel-strong)',
                  borderRadius: 16,
                  border: '1px solid var(--border)',
                  boxShadow: 'var(--shadow-lg)',
                  marginBottom: '40px',
                }}
              >
                {/* Header */}
                <div
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid var(--border)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'var(--panel-strong)',
                  borderRadius: '16px 16px 0 0',
                  flexShrink: 0,
                }}
              >
                <h3 style={{ margin: 0, fontWeight: 700, fontSize: '1rem', color: 'var(--text)' }}>
                  {editIndex !== null ? 'Edit Material' : 'Add Material'}
                </h3>
                <button
                  onClick={resetForm}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--muted)',
                    fontSize: '1.2rem',
                    lineHeight: 1,
                    padding: 4,
                  }}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Form - Scrollable */}
              <div style={{ padding: '16px', overflowY: 'auto', flex: 1, minHeight: 0 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  
                  {/* Upload Mode Toggle */}
                  {editIndex === null && (
                    <div style={{ display: 'flex', gap: 8, padding: '8px', background: 'var(--surface)', borderRadius: 8 }}>
                      <button
                        onClick={() => setUploadMode('url')}
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          borderRadius: 6,
                          border: 'none',
                          background: uploadMode === 'url' ? 'var(--accent)' : 'transparent',
                          color: uploadMode === 'url' ? '#fff' : 'var(--text)',
                          fontWeight: 600,
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                      >
                        <Link2 size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                        URL Link
                      </button>
                      <button
                        onClick={() => setUploadMode('file')}
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          borderRadius: 6,
                          border: 'none',
                          background: uploadMode === 'file' ? 'var(--accent)' : 'transparent',
                          color: uploadMode === 'file' ? '#fff' : 'var(--text)',
                          fontWeight: 600,
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                      >
                        <Upload size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                        Upload File
                      </button>
                    </div>
                  )}

                  {/* Title */}
                  <div className="ui-input-wrap">
                    <label className="ui-input-label" style={{ fontSize: '0.8rem', marginBottom: 4 }}>Title *</label>
                    <input
                      className="ui-input"
                      value={formData.title}
                      onChange={e => setFormData(f => ({ ...f, title: e.target.value }))}
                      placeholder="e.g. Lecture 1 - Introduction"
                      style={{ fontSize: '0.85rem', padding: '7px 10px' }}
                    />
                  </div>

                  {/* URL or File Upload */}
                  {uploadMode === 'url' ? (
                    <div className="ui-input-wrap">
                      <label className="ui-input-label" style={{ fontSize: '0.8rem', marginBottom: 4 }}>URL *</label>
                      <input
                        className="ui-input"
                        value={formData.url}
                        onChange={e => setFormData(f => ({ ...f, url: e.target.value }))}
                        placeholder="https://drive.google.com/..."
                        style={{ fontSize: '0.85rem', padding: '7px 10px' }}
                      />
                      <p className="ui-text-xs ui-text-muted" style={{ marginTop: 3, fontSize: '0.7rem' }}>
                        Google Drive, Dropbox, YouTube, or any public link
                      </p>
                    </div>
                  ) : (
                    <div className="ui-input-wrap">
                      <label className="ui-input-label" style={{ fontSize: '0.8rem', marginBottom: 4 }}>
                        Upload File *
                      </label>
                      <div
                        style={{
                          border: '2px dashed var(--border)',
                          borderRadius: 8,
                          padding: '16px',
                          textAlign: 'center',
                          background: 'var(--surface)',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.borderColor = 'var(--accent)';
                          e.currentTarget.style.background = 'var(--surface-soft)';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.borderColor = 'var(--border)';
                          e.currentTarget.style.background = 'var(--surface)';
                        }}
                        onClick={() => document.getElementById('file-upload')?.click()}
                      >
                        <input
                          id="file-upload"
                          type="file"
                          onChange={handleFileSelect}
                          style={{ display: 'none' }}
                          accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,.rar,.jpg,.jpeg,.png,.gif,.mp4,.avi,.mov"
                        />
                        {selectedFile ? (
                          <div>
                            <File size={32} style={{ color: 'var(--accent)', marginBottom: 8 }} />
                            <p style={{ margin: '4px 0', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)' }}>
                              {selectedFile.name}
                            </p>
                            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--muted)' }}>
                              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        ) : (
                          <div>
                            <Upload size={32} style={{ color: 'var(--muted)', marginBottom: 8 }} />
                            <p style={{ margin: '4px 0', fontSize: '0.85rem', color: 'var(--text)' }}>
                              Click to select file
                            </p>
                            <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--muted)' }}>
                              PDF, DOC, PPT, Images, Videos, Archives
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Type and Category */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div className="ui-input-wrap">
                      <label className="ui-input-label" style={{ fontSize: '0.8rem', marginBottom: 4 }}>Type</label>
                      <select
                        className="ui-select"
                        value={formData.type}
                        onChange={e => setFormData(f => ({ ...f, type: e.target.value }))}
                        style={{ fontSize: '0.85rem', padding: '7px 10px' }}
                      >
                        {MATERIAL_TYPES.map(type => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="ui-input-wrap">
                      <label className="ui-input-label" style={{ fontSize: '0.8rem', marginBottom: 4 }}>Category</label>
                      <select
                        className="ui-select"
                        value={formData.category}
                        onChange={e => setFormData(f => ({ ...f, category: e.target.value }))}
                        style={{ fontSize: '0.85rem', padding: '7px 10px' }}
                      >
                        {CATEGORIES.map(cat => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="ui-input-wrap">
                    <label className="ui-input-label" style={{ fontSize: '0.8rem', marginBottom: 4 }}>Description (Optional)</label>
                    <textarea
                      className="ui-input"
                      value={formData.description}
                      onChange={e => setFormData(f => ({ ...f, description: e.target.value }))}
                      placeholder="Brief description..."
                      rows={2}
                      style={{ resize: 'vertical', minHeight: 50, fontSize: '0.85rem', padding: '7px 10px' }}
                    />
                  </div>

                  {/* Size */}
                  <div className="ui-input-wrap">
                    <label className="ui-input-label" style={{ fontSize: '0.8rem', marginBottom: 4 }}>File Size (Optional)</label>
                    <input
                      className="ui-input"
                      value={formData.size}
                      onChange={e => setFormData(f => ({ ...f, size: e.target.value }))}
                      placeholder="e.g. 2.5 MB"
                      style={{ fontSize: '0.85rem', padding: '7px 10px' }}
                    />
                  </div>
                </div>
              </div>

              {/* Actions - Fixed at bottom */}
              <div
                style={{
                  padding: '12px 16px',
                  borderTop: '1px solid var(--border)',
                  background: 'var(--panel-strong)',
                  borderRadius: '0 0 16px 16px',
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    gap: 8,
                    justifyContent: 'flex-end',
                  }}
                >
                  <Button variant="outline" onClick={resetForm} size="sm">
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    leftIcon={editIndex !== null ? Check : Plus}
                    isLoading={submitting || uploading}
                    onClick={handleSubmit}
                    size="sm"
                  >
                    {uploading ? 'Uploading...' : editIndex !== null ? 'Update' : 'Add Material'}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
