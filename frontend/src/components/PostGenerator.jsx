import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { postService } from '../services/postService';
import { Check, Copy, Sparkles, Image, X, History } from 'lucide-react';

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
  const [modelUsed, setModelUsed] = useState(null);
  const [imageAnalysis, setImageAnalysis] = useState(null);
  const [imageModel, setImageModel] = useState(null);

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
    setModelUsed(null);
    setImageAnalysis(null);
    setImageModel(null);

    try {
      const response = await postService.generatePosts({
        ...formData,
        media_url: mediaPreview,
        media_type: mediaType,
      });
      setVariations(response.variations || []);
      setModelUsed(response.model_used || null);
      setImageAnalysis(response.image_analysis || null);
      setImageModel(response.image_model || null);
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
        image_analysis: imageAnalysis,
        generation_model: modelUsed,
        image_model: imageModel,
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
        setModelUsed(null);
        setImageAnalysis(null);
        setImageModel(null);
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
    <div className="flex flex-col h-full min-h-screen w-full overflow-hidden">
      <div className="flex flex-col flex-1 min-h-0 w-full max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
        <header className="flex-shrink-0 mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pr-14 sm:pr-16 lg:pr-24">
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold text-foreground flex items-center gap-2 sm:gap-3">
                <Sparkles className="h-6 w-6 sm:h-8 sm:w-8 text-primary-600 shrink-0" />
                Social Media Post Generator
              </h1>
              <p className="mt-1 text-sm text-muted">
                Generate engaging social media posts for Gaming, 3D, Design, AR/VR, and more.
              </p>
            </div>
            <Link
              to="/posts/history"
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-primary-500/25 bg-primary-500/10 text-sm font-semibold text-foreground transition-all duration-200 hover:bg-primary-500/25 hover:border-primary-500/50 w-fit"
            >
              <History className="h-4 w-4" />
              View History
            </Link>
          </div>
        </header>

        {error && (
          <div className="flex-shrink-0 mb-4 rounded-xl border border-red-500/25 bg-red-500/10 p-3 sm:p-4 text-sm text-red-600">
            {error}
          </div>
        )}

        {success && (
          <div className="flex-shrink-0 mb-4 rounded-xl border border-green-500/25 bg-green-500/10 p-3 sm:p-4 text-sm text-green-600">
            {success}
          </div>
        )}

        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 overflow-hidden">
          {/* Form Section */}
          <div className="flex flex-col min-h-0 overflow-y-auto space-y-4 sm:space-y-6">
            <div className="rounded-2xl border border-primary-500/25 bg-card p-4 sm:p-6 shrink-0">
              <h2 className="mb-4 text-lg sm:text-xl font-semibold text-foreground">Post Details</h2>
              
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

                {/* Media Upload — before generate so image can enrich AI copy */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    Media (optional)
                  </label>
                  {mediaPreview ? (
                    <div className="relative">
                      {mediaType === 'image' ? (
                        <img
                          src={mediaPreview}
                          alt="Preview"
                          className="w-full max-h-56 rounded-xl object-cover"
                        />
                      ) : (
                        <video
                          src={mediaPreview}
                          controls
                          className="w-full max-h-56 rounded-xl"
                        />
                      )}
                      <button
                        type="button"
                        onClick={removeMedia}
                        className="absolute top-2 right-2 rounded-full bg-red-500/90 p-2 text-white hover:bg-red-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-primary-500/25 bg-primary-500/5 p-6 transition hover:bg-primary-500/10">
                      <Image className="mb-2 h-10 w-10 text-primary-500" />
                      <span className="text-sm font-medium text-foreground">
                        Click to upload image or video
                      </span>
                      <span className="mt-1 text-xs text-muted">
                        Image is analyzed to improve post copy. Video is saved only.
                      </span>
                      <input
                        type="file"
                        accept="image/*,video/*"
                        onChange={handleMediaUpload}
                        className="hidden"
                        data-testid="media-upload-input"
                      />
                    </label>
                  )}
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
          </div>

          {/* Results Section */}
          <div className="flex flex-col min-h-0 overflow-y-auto space-y-4 sm:space-y-6">
            {variations.length > 0 ? (
              <>
                <div className="rounded-2xl border border-primary-500/25 bg-card p-4 sm:p-6 shrink-0">
                  <h2 className="mb-2 text-lg sm:text-xl font-semibold text-foreground">
                    Generated Variations
                  </h2>
                  {modelUsed && (
                    <p className="mb-4 text-xs text-muted-foreground">
                      Generated with {modelUsed}
                      {imageAnalysis ? ' · image context used' : ''}
                    </p>
                  )}
                  
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
                  <div className="rounded-2xl border border-primary-500/25 bg-card p-4 sm:p-6 shrink-0">
                    <h2 className="mb-4 text-lg sm:text-xl font-semibold text-foreground">Post Preview</h2>
                    
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
              <div className="flex-1 min-h-[280px] flex flex-col items-center justify-center rounded-2xl border border-primary-500/25 bg-card p-8 sm:p-12 text-center">
                <Sparkles className="mx-auto mb-4 h-12 w-12 sm:h-16 sm:w-16 text-primary-500/60" />
                <h3 className="mb-2 text-base sm:text-lg font-semibold text-foreground">
                  Ready to Generate
                </h3>
                <p className="text-sm text-muted max-w-sm">
                  Fill in the form and click &quot;Generate Posts&quot; to create your social media post variations.
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

