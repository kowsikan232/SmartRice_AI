import React, { useState, useRef, useEffect } from 'react';
import {
  User,
  Camera,
  Trash2,
  Save,
  X,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useProfile, isValidUserAvatar } from '../context/ProfileContext';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export default function ProfileView({ onCancel, onSaved }) {
  const { profile, updateProfile } = useProfile();

  // Local form state for editing
  const [formData, setFormData] = useState({
    name: 'Kowsikan',
    email: profile.email || 'user@email.com',
    department: profile.department || 'Artificial Intelligence & Data Science',
    college: profile.college || 'S.A. Engineering College',
    role: profile.role || ''
  });

  const [avatarPreview, setAvatarPreview] = useState(() => {
    return isValidUserAvatar(profile.avatar) ? profile.avatar : '';
  });
  const [selectedPhotoFile, setSelectedPhotoFile] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fileInputRef = useRef(null);

  // Synchronize when the underlying profile changes
  useEffect(() => {
    setFormData({
      name: 'Kowsikan',
      email: profile.email || 'user@email.com',
      department: profile.department || 'Artificial Intelligence & Data Science',
      college: profile.college || 'S.A. Engineering College',
      role: profile.role || ''
    });
    setAvatarPreview(isValidUserAvatar(profile.avatar) ? profile.avatar : '');
    setSelectedPhotoFile(null);
    setIsDirty(false);
  }, [profile]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
    setIsDirty(true);
    setSuccessMessage('');
    setErrorMessage('');
  };

  // User selects an image file — show preview only, do not immediately save until confirmed
  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setErrorMessage('Unsupported format. Please upload a valid JPG, JPEG, PNG, or WEBP image.');
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setErrorMessage('Image size exceeds limit. Please choose an image smaller than 5MB.');
      return;
    }

    setSelectedPhotoFile(file);

    // Show local preview immediately
    const reader = new FileReader();
    reader.onload = () => {
      setAvatarPreview(reader.result);
      setIsDirty(true);
      setErrorMessage('');
      setSuccessMessage('Photo selected. Click "Save Changes" to confirm.');
    };
    reader.onerror = () => {
      setErrorMessage('Failed to read image file. Please try another image.');
    };
    reader.readAsDataURL(file);

    // Reset input so re-selecting same file fires onChange
    e.target.value = '';
  };

  const handleRemovePhoto = () => {
    setSelectedPhotoFile(null);
    setAvatarPreview('');
    setIsDirty(true);
    setErrorMessage('');
    setSuccessMessage('Photo removed. Click "Save Changes" to confirm.');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    setIsSaving(true);
    try {
      let finalAvatarUrl = avatarPreview;

      // If the user selected a new photo file, upload it to Supabase Storage now
      if (selectedPhotoFile && isSupabaseConfigured && supabase) {
        const ext = selectedPhotoFile.name.split('.').pop() || 'jpg';
        const cleanName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
        const filePath = `avatars/${cleanName}`;

        const { error: uploadErr } = await supabase.storage
          .from('profile-images')
          .upload(filePath, selectedPhotoFile, {
            cacheControl: '3600',
            upsert: true
          });

        if (uploadErr) {
          console.warn('[Supabase Storage Upload Error]', uploadErr.message);
        } else {
          const { data: publicUrlData } = supabase.storage
            .from('profile-images')
            .getPublicUrl(filePath);

          if (publicUrlData?.publicUrl) {
            finalAvatarUrl = publicUrlData.publicUrl;
          }
        }
      }

      // Save changes into context, localStorage & Supabase
      await updateProfile({
        name: 'Kowsikan',
        email: formData.email.trim(),
        department: formData.department.trim(),
        college: formData.college.trim(),
        role: formData.role.trim(),
        avatar: finalAvatarUrl
      });

      setSelectedPhotoFile(null);
      setIsDirty(false);
      setSuccessMessage('Profile saved successfully.');

      if (onSaved) {
        onSaved();
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to save profile changes.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: 'Kowsikan',
      email: profile.email || 'user@email.com',
      department: profile.department || 'Artificial Intelligence & Data Science',
      college: profile.college || 'S.A. Engineering College',
      role: profile.role || ''
    });
    setAvatarPreview(isValidUserAvatar(profile.avatar) ? profile.avatar : '');
    setSelectedPhotoFile(null);
    setIsDirty(false);
    setErrorMessage('');
    setSuccessMessage('');

    if (onCancel) {
      onCancel();
    }
  };

  const hasPhoto = avatarPreview && isValidUserAvatar(avatarPreview);

  return (
    <div className="profile-page-container">
      {/* Top Banner / Alerts */}
      {successMessage && (
        <div className="profile-alert alert-success" role="status">
          <CheckCircle2 size={18} />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="profile-alert alert-error" role="alert">
          <AlertCircle size={18} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 1. Profile Avatar Card */}
      <div className="profile-card profile-hero-card">
        <h2 className="profile-card-title">Profile</h2>

        <div className="profile-avatar-large-wrap">
          <div className="profile-avatar-large">
            {hasPhoto ? (
              <img
                src={avatarPreview}
                alt="Kowsikan"
                className="profile-avatar-img"
              />
            ) : (
              <User size={54} className="profile-neutral-user-icon" />
            )}
          </div>
        </div>

        <div className="profile-hero-text">
          <h3 className="profile-hero-name">Kowsikan</h3>
        </div>

        {/* Change / Upload / Remove Photo actions */}
        <div className="profile-photo-actions">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handlePhotoSelect}
            accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
            style={{ display: 'none' }}
            id="profile-photo-upload"
          />
          <button
            type="button"
            className="btn btn-outline-primary btn-sm"
            onClick={() => fileInputRef.current?.click()}
            title="Upload or change profile photo (JPG, PNG, WEBP max 5MB)"
          >
            <Camera size={14} />
            <span>{hasPhoto ? 'Change Photo' : 'Upload Photo'}</span>
          </button>

          {hasPhoto && (
            <button
              type="button"
              className="btn btn-outline-danger btn-sm"
              onClick={handleRemovePhoto}
              title="Remove profile photo"
            >
              <Trash2 size={14} />
              <span>Remove Photo</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Personal Information Form Card */}
      <div className="profile-card">
        <div className="profile-section-header">
          <div className="card-title-group">
            <User size={19} className="card-header-icon" />
            <div>
              <h3 className="profile-section-title">Personal Information</h3>
              <p className="card-subtitle">
                Academic and personal identity details for Smart Rice AI reports & evaluations
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="profile-form">
          <div className="profile-form-grid">
            {/* Full Name */}
            <div className="form-field full-width">
              <label htmlFor="profile-fullname" className="field-label">
                Full Name <span className="required-star">*</span>
              </label>
              <input
                id="profile-fullname"
                type="text"
                name="name"
                className="field-input"
                placeholder="Kowsikan"
                value={formData.name}
                onChange={handleInputChange}
                required
              />
            </div>

            {/* Email */}
            <div className="form-field full-width">
              <label htmlFor="profile-email" className="field-label">
                Email
              </label>
              <div className="field-input-wrap">
                <input
                  id="profile-email"
                  type="email"
                  name="email"
                  className="field-input"
                  placeholder="user@email.com"
                  value={formData.email}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            {/* Department */}
            <div className="form-field">
              <label htmlFor="profile-department" className="field-label">
                Department
              </label>
              <input
                id="profile-department"
                type="text"
                name="department"
                className="field-input"
                placeholder="Artificial Intelligence & Data Science"
                value={formData.department}
                onChange={handleInputChange}
              />
            </div>

            {/* College */}
            <div className="form-field">
              <label htmlFor="profile-college" className="field-label">
                College
              </label>
              <input
                id="profile-college"
                type="text"
                name="college"
                className="field-input"
                placeholder="S.A. Engineering College"
                value={formData.college}
                onChange={handleInputChange}
              />
            </div>

            {/* Role */}
            <div className="form-field full-width">
              <label htmlFor="profile-role" className="field-label">
                Role
              </label>
              <input
                id="profile-role"
                type="text"
                name="role"
                className="field-input"
                placeholder="e.g. Student"
                value={formData.role}
                onChange={handleInputChange}
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="profile-actions-bar">
            <button
              type="button"
              className="btn btn-secondary btn-md"
              onClick={handleCancel}
            >
              <X size={15} />
              <span>Cancel</span>
            </button>

            <button
              type="submit"
              className="btn btn-primary btn-md"
              disabled={isSaving}
            >
              <Save size={15} />
              <span>{isSaving ? 'Saving Changes...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
