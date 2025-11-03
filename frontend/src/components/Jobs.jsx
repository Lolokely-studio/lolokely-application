import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { jobService } from '../services/taskService';
import { MagnifyingGlassIcon, XMarkIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

const Jobs = () => {
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedJob, setSelectedJob] = useState(null);
  const itemsPerPage = 10;

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    try {
      setLoading(true);
      const response = await jobService.getJobs();
      setJobs(response.jobs || []);
    } catch (error) {
      console.error('Error loading jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter jobs based on search query
  const filteredJobs = useMemo(() => {
    if (!searchQuery.trim()) {
      return jobs;
    }

    const query = searchQuery.toLowerCase().trim();
    return jobs.filter(job =>
      job.title?.toLowerCase().includes(query) ||
      job.description?.toLowerCase().includes(query) ||
      job.company_name?.toLowerCase().includes(query) ||
      job.location?.toLowerCase().includes(query) ||
      job.skills?.some(skill => skill?.toLowerCase().includes(query))
    );
  }, [jobs, searchQuery]);

  // Paginate filtered jobs
  const paginatedJobs = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredJobs.slice(startIndex, endIndex);
  }, [filteredJobs, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredJobs.length / itemsPerPage);

  // Reset to page 1 when search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const handlePrevious = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const formatCurrency = (amount) => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleJobClick = (job) => {
    setSelectedJob(job);
  };

  const handleCloseModal = () => {
    setSelectedJob(null);
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      handleCloseModal();
    }
  };

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (selectedJob) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [selectedJob]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-20 w-20 animate-spin rounded-full border-4 border-primary-500/30 border-t-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="relative z-10 min-h-screen pb-16">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-foreground">
            Jobs
          </h1>
          <p className="mt-2 text-muted">
            Browse available job opportunities.
          </p>
        </div>

        <div className="mb-6">
          <div className="relative w-full max-w-md">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
              <MagnifyingGlassIcon className="h-5 w-5 text-primary-500/70" />
            </div>
            <input
              type="text"
              placeholder="Search jobs by title, company, location, or skills..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field !pl-11 !pr-12 !py-3 text-sm"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 flex items-center pr-4 text-muted transition hover:text-foreground"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            )}
          </div>

          {searchQuery && (
            <div className="mt-4 flex items-center gap-2">
              <span className="chip">
                Search: "{searchQuery}"
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="ml-1 flex h-5 w-5 items-center justify-center rounded-full text-[inherit] opacity-80 transition hover:opacity-100"
                >
                  <XMarkIcon className="h-3 w-3" />
                </button>
              </span>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {filteredJobs.length === 0 ? (
            <div className="py-12 text-center">
              <div className="mb-4 text-6xl text-primary-500/60">
                {searchQuery ? '🔍' : '💼'}
              </div>
              <h3 className="mb-2 text-lg font-semibold text-foreground">
                {searchQuery ? 'No jobs found' : 'No jobs available'}
              </h3>
              <p className="text-muted">
                {searchQuery
                  ? 'No jobs match your search query. Try adjusting your search terms.'
                  : 'There are no jobs available at the moment.'}
              </p>
            </div>
          ) : (
            <>
              <div className="mb-2 text-sm text-muted">
                {searchQuery ? (
                  <>Showing {filteredJobs.length} job{filteredJobs.length !== 1 ? 's' : ''} matching "{searchQuery}"</>
                ) : (
                  <>Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredJobs.length)} of {filteredJobs.length} jobs</>
                )}
              </div>
              {paginatedJobs.map((job) => (
                <div
                  key={job.id}
                  className="glass-card rounded-2xl border border-primary-500/10 p-6 transition-all duration-200 hover:border-primary-500/20 hover:shadow-lg"
                >
                  <div className="flex flex-col gap-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          {job.company_logo && (
                            <img
                              src={job.company_logo}
                              alt={job.company_name || 'Company logo'}
                              className="h-12 w-12 rounded-lg object-cover"
                            />
                          )}
                          <div>
                            <h3 
                              onClick={() => handleJobClick(job)}
                              className="text-xl font-semibold text-foreground cursor-pointer hover:text-primary-600 transition-colors duration-200"
                            >
                              {job.title || 'Untitled Job'}
                            </h3>
                            <p className="text-sm text-muted">
                              {job.company_name || 'Company'}
                              {job.location && ` • ${job.location}`}
                              {job.remote && ' • Remote'}
                            </p>
                          </div>
                        </div>
                      </div>
                      {job.url && (
                        <a
                          href={job.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-primary whitespace-nowrap text-sm"
                        >
                          View Job
                        </a>
                      )}
                    </div>

                    {job.description && (
                      <p className="text-sm text-muted line-clamp-3">
                        {job.description}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-4 text-sm">
                      {job.budget_min && job.budget_max && (
                        <div className="flex items-center gap-1">
                          <span className="font-semibold text-foreground">Budget:</span>
                          <span className="text-muted">
                            {formatCurrency(job.budget_min)} - {formatCurrency(job.budget_max)}
                          </span>
                        </div>
                      )}
                      {job.job_type && (
                        <div className="flex items-center gap-1">
                          <span className="font-semibold text-foreground">Type:</span>
                          <span className="text-muted capitalize">{job.job_type}</span>
                        </div>
                      )}
                      {job.experience_level && (
                        <div className="flex items-center gap-1">
                          <span className="font-semibold text-foreground">Experience:</span>
                          <span className="text-muted capitalize">{job.experience_level}</span>
                        </div>
                      )}
                      {job.posted_at && (
                        <div className="flex items-center gap-1">
                          <span className="font-semibold text-foreground">Posted:</span>
                          <span className="text-muted">{formatDate(job.posted_at)}</span>
                        </div>
                      )}
                      {job.deadline && (
                        <div className="flex items-center gap-1">
                          <span className="font-semibold text-foreground">Deadline:</span>
                          <span className="text-muted">{formatDate(job.deadline)}</span>
                        </div>
                      )}
                    </div>

                    {job.skills && job.skills.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {job.skills.map((skill, index) => (
                          <span
                            key={index}
                            className="chip bg-primary-500/15 text-primary-600 border-primary-500/25"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}

                    {job.source && (
                      <div className="text-xs text-muted">
                        Source: <span className="font-medium capitalize">{job.source}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Pagination Controls */}
        {filteredJobs.length > itemsPerPage && (
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-muted">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevious}
                disabled={currentPage === 1}
                className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-all duration-200 ${
                  currentPage > 1
                    ? 'border-primary-500/25 bg-primary-500/15 text-foreground hover:bg-primary-500/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400'
                    : 'border-primary-500/10 bg-primary-500/5 text-muted cursor-not-allowed opacity-50'
                }`}
              >
                <ChevronLeftIcon className="h-4 w-4" />
                Previous
              </button>

              <button
                onClick={handleNext}
                disabled={currentPage === totalPages}
                className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-all duration-200 ${
                  currentPage < totalPages
                    ? 'border-primary-500/25 bg-primary-500/15 text-foreground hover:bg-primary-500/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400'
                    : 'border-primary-500/10 bg-primary-500/5 text-muted cursor-not-allowed opacity-50'
                }`}
              >
                Next
                <ChevronRightIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Job Details Modal */}
      {selectedJob && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4"
          onClick={handleBackdropClick}
        >
          <div
            className="glass-panel mx-4 w-full max-w-3xl max-h-[90vh] overflow-y-auto px-6 py-6 sm:px-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-foreground">Job Details</h2>
              <button
                onClick={handleCloseModal}
                className="text-muted transition hover:text-foreground"
                aria-label="Close modal"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Header Section */}
              <div className="flex items-start gap-4">
                {selectedJob.company_logo && (
                  <img
                    src={selectedJob.company_logo}
                    alt={selectedJob.company_name || 'Company logo'}
                    className="h-16 w-16 rounded-lg object-cover flex-shrink-0"
                  />
                )}
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-foreground mb-2">
                    {selectedJob.title || 'Untitled Job'}
                  </h3>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
                    {selectedJob.company_name && (
                      <span className="font-medium text-foreground">{selectedJob.company_name}</span>
                    )}
                    {selectedJob.location && <span>• {selectedJob.location}</span>}
                    {selectedJob.remote && <span>• Remote</span>}
                    {selectedJob.source && (
                      <span className="ml-auto capitalize">Source: {selectedJob.source}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Description Section */}
              {selectedJob.description && (
                <div>
                  <h4 className="text-lg font-semibold text-foreground mb-3">Description</h4>
                  <div className="prose prose-sm max-w-none">
                    <p className="text-muted whitespace-pre-wrap leading-relaxed">
                      {selectedJob.description}
                    </p>
                  </div>
                </div>
              )}

              {/* Job Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedJob.job_type && (
                  <div className="glass-card rounded-xl border border-primary-500/10 p-4">
                    <div className="text-sm font-semibold text-foreground mb-1">Job Type</div>
                    <div className="text-sm text-muted capitalize">{selectedJob.job_type}</div>
                  </div>
                )}
                {selectedJob.experience_level && (
                  <div className="glass-card rounded-xl border border-primary-500/10 p-4">
                    <div className="text-sm font-semibold text-foreground mb-1">Experience Level</div>
                    <div className="text-sm text-muted capitalize">{selectedJob.experience_level}</div>
                  </div>
                )}
                {selectedJob.budget_min && selectedJob.budget_max && (
                  <div className="glass-card rounded-xl border border-primary-500/10 p-4">
                    <div className="text-sm font-semibold text-foreground mb-1">Budget Range</div>
                    <div className="text-sm text-muted">
                      {formatCurrency(selectedJob.budget_min)} - {formatCurrency(selectedJob.budget_max)}
                    </div>
                  </div>
                )}
                {selectedJob.posted_at && (
                  <div className="glass-card rounded-xl border border-primary-500/10 p-4">
                    <div className="text-sm font-semibold text-foreground mb-1">Posted Date</div>
                    <div className="text-sm text-muted">{formatDate(selectedJob.posted_at)}</div>
                  </div>
                )}
                {selectedJob.deadline && (
                  <div className="glass-card rounded-xl border border-primary-500/10 p-4">
                    <div className="text-sm font-semibold text-foreground mb-1">Application Deadline</div>
                    <div className="text-sm text-muted">{formatDate(selectedJob.deadline)}</div>
                  </div>
                )}
                {selectedJob.remote !== null && selectedJob.remote !== undefined && (
                  <div className="glass-card rounded-xl border border-primary-500/10 p-4">
                    <div className="text-sm font-semibold text-foreground mb-1">Remote Work</div>
                    <div className="text-sm text-muted">{selectedJob.remote ? 'Yes' : 'No'}</div>
                  </div>
                )}
              </div>

              {/* Skills Section */}
              {selectedJob.skills && selectedJob.skills.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold text-foreground mb-3">Required Skills</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedJob.skills.map((skill, index) => (
                      <span
                        key={index}
                        className="chip bg-primary-500/15 text-primary-600 border-primary-500/25"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-primary-500/10">
                {selectedJob.url && (
                  <a
                    href={selectedJob.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary flex-1 text-center"
                  >
                    View on Source Website
                  </a>
                )}
                <button
                  onClick={handleCloseModal}
                  className="btn-secondary flex-1"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Jobs;

