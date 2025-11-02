import React, { useState, useRef } from 'react';
import { db, storage } from '../firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { compressImage } from '../utils/imageCompressor';
import { useTranslation } from 'react-i18next';

// Expected data shape in Firestore /posts
// {
//   postedAt: serverTimestamp(),
//   imageUrl: string,
//   caption: string,
//   author: string, // username
//   likeCount: number,
//   authorPp: string // photo URL
// }

const CreatePost = ({ currentUser }) => {
  const [file, setFile] = useState(null);
  const [caption, setCaption] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const uploadTokenRef = useRef(0);
  const fileInputRef = useRef(null);

  const { t } = useTranslation();

  const triggerFilePicker = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const onFileChange = async (e) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
    setError('');
    setImageUrl('');
    setPreviewUrl('');
    if (!f) return;
    // Local preview (original file). Optionally could preview compressed version.
    const localUrl = URL.createObjectURL(f);
    setPreviewUrl(localUrl);

    if (!currentUser || !currentUser.uid) {
      setError(t('mustSignInToPost'));
      return;
    }

    // Begin compress + upload
    const myToken = ++uploadTokenRef.current;
    try {
      setUploading(true);
      const blob = await compressImage(f, 1080, 0.85);
      const ext = 'webp';
      const storagePath = `posts/${currentUser.uid}/${Date.now()}.${ext}`;
      const storageRef = ref(storage, storagePath);
      await uploadBytes(storageRef, blob, { contentType: 'image/webp' });
      const url = await getDownloadURL(storageRef);
      // Drop result if a new upload started since
      if (uploadTokenRef.current === myToken) {
        setImageUrl(url);
      }
    } catch (err) {
      console.error('Image upload failed:', err);
      if (uploadTokenRef.current === myToken) {
        setError(t('imageUploadFailed'));
        setImageUrl('');
      }
    } finally {
      if (uploadTokenRef.current === myToken) setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!currentUser || !currentUser.username) {
      setError(t('mustSignInToPost'));
      return;
    }
    if (!imageUrl) {
      setError(t('waitImageUpload'));
      return;
    }

    try {
      setSubmitting(true);
      // Save post with uploaded imageUrl
      const post = {
        postedAt: serverTimestamp(),
        imageUrl,
        caption: caption.trim().slice(0, 100),
        author: currentUser.username,
        likeCount: 0,
        authorPp: currentUser.photoURL || currentUser.photoUrl || '',
        authorUid: currentUser.uid,
      };

      await addDoc(collection(db, 'posts'), post);

      location.reload();
    } catch (err) {
      console.error('Failed to create post:', err);
      setError(t('failedCreatePost'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="create-post">
      <h3>{t('createPostTitle')}</h3>
      <form onSubmit={handleSubmit} className="create-post-form">
        {/* Hidden native file input: triggered by custom button to avoid showing filename */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={onFileChange}
          style={{ display: 'none' }}
        />
        <div className="upload-actions">
              <button type="button" onClick={triggerFilePicker}>
                {previewUrl ? t('changeImage') : t('selectPhoto')}
              </button>
            </div>
        {previewUrl && (
          <div className="image-preview">
            <img src={previewUrl} alt={t('selectedPreviewAlt')} />
            {uploading && <p className="info-message">{t('uploadingImage')}</p>}
          </div>
        )}
        {imageUrl && !uploading && (
          <>
            <input
              type="text"
              placeholder={t('addACaption')}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              maxLength={100}
            />
            <div className="char-counter">{caption.length}/100</div>
          </>
        )}
        {imageUrl && !uploading && (
          <button type="submit" disabled={submitting} className="btn-primary" style={{width: '100%'}}>
            {submitting ? t('posting') : t('post')}
          </button>
        )}
        {error && <p className="error-message">{error}</p>}
      </form>
    </div>
  );
};

export default CreatePost;
