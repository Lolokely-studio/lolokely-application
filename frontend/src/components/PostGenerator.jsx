import React, { useState } from 'react';
import { postService } from '../services/postService';
import { Check, Copy, Sparkles, Image, X } from 'lucide-react';

const PostGenerator = () => {
  const [formData, setFormData] = useState({
    theme: '',
    description: '',
    platform: 'Instagram',
    tonality: 'Professional',
    language: 'en',
    target_audience: '',
  });

  const [variations, setVariations] = useState([]);
  const [selectedVariation, setSelectedVariation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [mediaPreview, setMediaPreview] = useState(null);
  const [mediaType, setMediaType] = useState(null);

  const platforms = ['Instagram', 'Facebook', 'Twitter', 'LinkedIn', 'TikTok', 'YouTube'];
  const tonalities = ['Professional', 'Casual', 'Funny', 'Inspirational', 'Educational', 'Energetic'];
  const languages = [
    { code: 'en', name: 'English' },
    { code: 'fr', name: 'French' },
    { code: 'es', name: 'Spanish' },
    { code: 'de', name: 'German' },
    { code: 'it', name: 'Italian' },
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    setVariations([]);
    setSelectedVariation('');

    try {
      const response = await postService.generatePosts(formData);
      setVariations(response.variations || []);
      if (response.variations && response.variations.length > 0) {
        setSelectedVariation(response.variations[0]);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate posts. Please try again.');
      console.error('Error generating posts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedVariation) {
      setError('Please select a variation before saving');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      await postService.savePost({
        ...formData,
        generated_variations: variations,
        selected_variation: selectedVariation,
        media_url: mediaPreview,
        media_type: mediaType,
      });

      setSuccess('Post saved successfully!');
      // Reset form after a delay
      setTimeout(() => {
        setFormData({
          theme: '',
          description: '',
          platform: 'Instagram',
          tonality: 'Professional',
          language: 'en',
          target_audience: '',
        });
        setVariations([]);
        setSelectedVariation('');
        setMediaPreview(null);
        setMediaType(null);
        setSuccess('');
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save post. Please try again.');
      console.error('Error saving post:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (selectedVariation) {
      navigator.clipboard.writeText(selectedVariation);
      setSuccess('Post copied to clipboard!');
      setTimeout(() => setSuccess(''), 2000);
    }
  };

  const handleMediaUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setMediaPreview(reader.result);
        setMediaType(file.type.startsWith('image/') ? 'image' : 'video');
      };
      reader.readAsDataURL(file);
    }
  };

  const removeMedia = () => {
    setMediaPreview(null);
    setMediaType(null);
  };

  return (
    <div className="min-h-screen py-8">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-foreground flex items-center gap-3">
            <Sparkles className="h-8 w-8 text-primary-600" />
            Social Media Post Generator
          </h1>
          <p className="mt-2 text-muted">
            Generate engaging social media posts for Gaming, 3D, Design, AR/VR, and more.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-500/25 bg-red-500/10 p-4 text-red-600">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 rounded-xl border border-green-500/25 bg-green-500/10 p-4 text-green-600">
            {success}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Form Section */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-primary-500/25 bg-card p-6">
              <h2 className="mb-4 text-xl font-semibold text-foreground">Post Details</h2>
              
              <form onSubmit={handleGenerate} className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    Theme <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="theme"
                    value={formData.theme}
                    onChange={handleInputChange}
                    placeholder="e.g., New AR Game Launch"
                    required
                    className="input-field w-full"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Describe what the post should be about..."
                    rows="4"
                    className="input-field w-full resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-foreground">
                      Platform <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="platform"
                      value={formData.platform}
                      onChange={handleInputChange}
                      required
                      className="input-field w-full"
                    >
                      {platforms.map(platform => (
                        <option key={platform} value={platform}>{platform}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-foreground">
                      Tonality <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="tonality"
                      value={formData.tonality}
                      onChange={handleInputChange}
                      required
                      className="input-field w-full"
                    >
                      {tonalities.map(tonality => (
                        <option key={tonality} value={tonality}>{tonality}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-foreground">
                      Language
                    </label>
                    <select
                      name="language"
                      value={formData.language}
                      onChange={handleInputChange}
                      className="input-field w-full"
                    >
                      {languages.map(lang => (
                        <option key={lang.code} value={lang.code}>{lang.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-foreground">
                      Target Audience
                    </label>
                    <input
                      type="text"
                      name="target_audience"
                      value={formData.target_audience}
                      onChange={handleInputChange}
                      placeholder="e.g., Game developers, 18-35"
                      className="input-field w-full"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5" />
                      Generate Posts
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Media Upload Section */}
            {variations.length > 0 && (
              <div className="rounded-2xl border border-primary-500/25 bg-card p-6">
                <h2 className="mb-4 text-xl font-semibold text-foreground">Add Media</h2>
                
                {mediaPreview ? (
                  <div className="relative">
                    {mediaType === 'image' ? (
                      <img
                        src={mediaPreview}
                        alt="Preview"
                        className="w-full rounded-xl object-cover"
                      />
                    ) : (
                      <video
                        src={mediaPreview}
                        controls
                        className="w-full rounded-xl"
                      />
                    )}
                    <button
                      onClick={removeMedia}
                      className="absolute top-2 right-2 rounded-full bg-red-500/90 p-2 text-white hover:bg-red-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-primary-500/25 bg-primary-500/5 p-8 transition hover:bg-primary-500/10">
                    <Image className="mb-2 h-12 w-12 text-primary-500" />
                    <span className="text-sm font-medium text-foreground">
                      Click to upload image or video
                    </span>
                    <span className="mt-1 text-xs text-muted">
                      Supports JPG, PNG, GIF, MP4, MOV
                    </span>
                    <input
                      type="file"
                      accept="image/*,video/*"
                      onChange={handleMediaUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            )}
          </div>

          {/* Results Section */}
          <div className="space-y-6">
            {variations.length > 0 ? (
              <>
                <div className="rounded-2xl border border-primary-500/25 bg-card p-6">
                  <h2 className="mb-4 text-xl font-semibold text-foreground">
                    Generated Variations
                  </h2>
                  
                  <div className="space-y-4">
                    {variations.map((variation, index) => (
                      <div
                        key={index}
                        onClick={() => setSelectedVariation(variation)}
                        className={`cursor-pointer rounded-xl border p-4 transition ${
                          selectedVariation === variation
                            ? 'border-primary-500 bg-primary-500/10'
                            : 'border-primary-500/25 bg-card hover:border-primary-500/50'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 ${
                            selectedVariation === variation
                              ? 'border-primary-500 bg-primary-500'
                              : 'border-primary-500/25'
                          }`}>
                            {selectedVariation === variation && (
                              <Check className="h-4 w-4 text-white" />
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-foreground mb-1">
                              Variation {index + 1}
                            </p>
                            <p className="text-sm text-muted whitespace-pre-wrap">
                              {variation}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Preview Section */}
                {selectedVariation && (
                  <div className="rounded-2xl border border-primary-500/25 bg-card p-6">
                    <h2 className="mb-4 text-xl font-semibold text-foreground">Post Preview</h2>
                    
                    <div className="mb-4 rounded-xl border border-primary-500/25 bg-background p-4">
                      {mediaPreview && (
                        <div className="mb-4">
                          {mediaType === 'image' ? (
                            <img
                              src={mediaPreview}
                              alt="Post media"
                              className="w-full rounded-lg object-cover"
                            />
                          ) : (
                            <video
                              src={mediaPreview}
                              controls
                              className="w-full rounded-lg"
                            />
                          )}
                        </div>
                      )}
                      <p className="whitespace-pre-wrap text-sm text-foreground">
                        {selectedVariation}
                      </p>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={handleCopy}
                        className="btn-primary flex-1 flex items-center justify-center gap-2"
                      >
                        <Copy className="h-4 w-4" />
                        Copy Text
                      </button>
                      <button
                        onClick={handleSave}
                        disabled={loading}
                        className="btn-primary flex-1 flex items-center justify-center gap-2"
                      >
                        {loading ? (
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
                        ) : (
                          'Save Post'
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-2xl border border-primary-500/25 bg-card p-12 text-center">
                <Sparkles className="mx-auto mb-4 h-16 w-16 text-primary-500/60" />
                <h3 className="mb-2 text-lg font-semibold text-foreground">
                  Ready to Generate
                </h3>
                <p className="text-muted">
                  Fill in the form and click "Generate Posts" to create your social media post variations.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostGenerator;

