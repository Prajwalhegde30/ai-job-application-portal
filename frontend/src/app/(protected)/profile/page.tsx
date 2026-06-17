'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import { profileSchema, type ProfileFormData } from '@/lib/validators/profile';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  User,
  Briefcase,
  GraduationCap,
  Plus,
  Trash2,
  Globe,
  Phone,
  MapPin,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Save,
  Link as LinkIcon,
} from 'lucide-react';

interface RawExperience {
  company?: string;
  title?: string;
  startDate?: string;
  endDate?: string;
  current?: boolean;
  description?: string;
}

interface RawEducation {
  institution?: string;
  degree?: string;
  field?: string;
  startYear?: number | string;
  endYear?: number | string | null;
}

export default function ProfilePage() {
  const { user } = useAuth();
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completionPercentage, setCompletionPercentage] = useState(0);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'skills' | 'experience' | 'education'
  >('overview');

  // Feedback states
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(
      profileSchema
    ) as unknown as Resolver<ProfileFormData>,
    defaultValues: {
      headline: '',
      bio: '',
      location: '',
      phone: '',
      website: '',
      linkedin_url: '',
      github_url: '',
      skills: [],
      experience: [],
      education: [],
    },
  });

  const {
    fields: experienceFields,
    append: appendExperience,
    remove: removeExperience,
  } = useFieldArray({
    control,
    name: 'experience',
  });

  const {
    fields: educationFields,
    append: appendEducation,
    remove: removeEducation,
  } = useFieldArray({
    control,
    name: 'education',
  });

  // Watch fields for dynamic interactivity (like skills)
  const watchedSkills = watch('skills') || [];
  const [skillInput, setSkillInput] = useState('');

  // Fetch initial profile data on mount
  useEffect(() => {
    async function fetchProfile() {
      try {
        setIsProfileLoading(true);
        const response = await api.get('/profile');
        const data = response.data.data;
        const profile = data.profile;

        // Map null values to empty strings to keep inputs controlled
        const sanitizedProfile = {
          headline: profile.headline || '',
          bio: profile.bio || '',
          location: profile.location || '',
          phone: profile.phone || '',
          website: profile.website || '',
          linkedin_url: profile.linkedin_url || '',
          github_url: profile.github_url || '',
          skills: profile.skills || [],
          experience: ((profile.experience as RawExperience[]) || []).map(
            (exp) => ({
              company: exp.company || '',
              title: exp.title || '',
              startDate: exp.startDate || '',
              endDate: exp.endDate || '',
              current: exp.current ?? false,
              description: exp.description || '',
            })
          ),
          education: ((profile.education as RawEducation[]) || []).map(
            (edu) => ({
              institution: edu.institution || '',
              degree: edu.degree || '',
              field: edu.field || '',
              startYear: Number(edu.startYear) || new Date().getFullYear(),
              endYear: edu.endYear ? Number(edu.endYear) : null,
            })
          ),
        };

        reset(sanitizedProfile);
        setCompletionPercentage(data.completionPercentage || 0);
      } catch (err: unknown) {
        const error = err as {
          response?: { data?: { error?: { message?: string } } };
        };
        setErrorMessage(
          error.response?.data?.error?.message || 'Failed to load user profile.'
        );
      } finally {
        setIsProfileLoading(false);
      }
    }

    fetchProfile();
  }, [reset]);

  const handleAddSkill = () => {
    const trimmed = skillInput.trim();
    if (trimmed && !watchedSkills.includes(trimmed)) {
      if (trimmed.length > 50) return;
      if (watchedSkills.length >= 50) return;
      setValue('skills', [...watchedSkills, trimmed], {
        shouldDirty: true,
        shouldValidate: true,
      });
      setSkillInput('');
    }
  };

  const handleSkillKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddSkill();
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setValue(
      'skills',
      watchedSkills.filter((s) => s !== skillToRemove),
      { shouldDirty: true, shouldValidate: true }
    );
  };

  const onSubmit = async (data: ProfileFormData) => {
    setIsSubmitting(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    // Clean empty values to send null instead of empty string for optional fields
    const payload = {
      headline: data.headline?.trim() || null,
      bio: data.bio?.trim() || null,
      location: data.location?.trim() || null,
      phone: data.phone?.trim() || null,
      website: data.website?.trim() || null,
      linkedin_url: data.linkedin_url?.trim() || null,
      github_url: data.github_url?.trim() || null,
      skills: data.skills || [],
      experience: (data.experience || []).map((exp) => ({
        company: exp.company.trim(),
        title: exp.title.trim(),
        startDate: exp.startDate.trim(),
        endDate: exp.current ? '' : exp.endDate.trim(),
        current: exp.current,
        description: exp.description.trim(),
      })),
      education: (data.education || []).map((edu) => ({
        institution: edu.institution.trim(),
        degree: edu.degree.trim(),
        field: edu.field.trim(),
        startYear: edu.startYear,
        endYear: edu.endYear || null,
      })),
    };

    try {
      const response = await api.put('/profile', payload);
      const updatedData = response.data.data;
      const profile = updatedData.profile;

      // Reset form with updated data to clean dirty state
      const sanitizedProfile = {
        headline: profile.headline || '',
        bio: profile.bio || '',
        location: profile.location || '',
        phone: profile.phone || '',
        website: profile.website || '',
        linkedin_url: profile.linkedin_url || '',
        github_url: profile.github_url || '',
        skills: profile.skills || [],
        experience: ((profile.experience as RawExperience[]) || []).map(
          (exp) => ({
            company: exp.company || '',
            title: exp.title || '',
            startDate: exp.startDate || '',
            endDate: exp.endDate || '',
            current: exp.current ?? false,
            description: exp.description || '',
          })
        ),
        education: ((profile.education as RawEducation[]) || []).map((edu) => ({
          institution: edu.institution || '',
          degree: edu.degree || '',
          field: edu.field || '',
          startYear: Number(edu.startYear) || new Date().getFullYear(),
          endYear: edu.endYear ? Number(edu.endYear) : null,
        })),
      };

      reset(sanitizedProfile);
      setCompletionPercentage(updatedData.completionPercentage || 0);
      setSuccessMessage('Profile updated successfully!');

      // Auto-clear success message
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: unknown) {
      const error = err as {
        response?: { data?: { error?: { message?: string } } };
      };
      setErrorMessage(
        error.response?.data?.error?.message ||
          'Failed to update profile. Please verify your inputs.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isProfileLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-32 w-full rounded-2xl bg-slate-800" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          <div className="space-y-3 lg:col-span-1">
            <div className="h-10 rounded-lg bg-slate-800" />
            <div className="h-10 rounded-lg bg-slate-800" />
            <div className="h-10 rounded-lg bg-slate-800" />
            <div className="h-10 rounded-lg bg-slate-800" />
          </div>
          <div className="h-96 rounded-2xl bg-slate-800 lg:col-span-3" />
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', name: 'Overview', icon: User },
    { id: 'skills', name: 'Skills & Expertise', icon: Globe },
    { id: 'experience', name: 'Experience', icon: Briefcase },
    { id: 'education', name: 'Education', icon: GraduationCap },
  ] as const;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* Top Banner & Completion Indicator */}
      <div className="via-slate-850 relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 to-slate-900 p-8 shadow-2xl">
        <div className="pointer-events-none absolute top-0 right-0 h-40 w-40 rounded-full bg-blue-500/5 blur-3xl" />
        <div className="pointer-events-none absolute right-10 bottom-0 h-40 w-40 rounded-full bg-violet-500/5 blur-3xl" />

        <div className="relative z-10 grid grid-cols-1 gap-6 md:grid-cols-3 md:items-center">
          <div className="space-y-2 md:col-span-2">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 font-bold text-white shadow-lg shadow-blue-500/20">
                {user?.name ? user.name[0].toUpperCase() : 'U'}
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  {user?.name || 'Your Profile'}
                </h1>
                <p className="text-xs font-medium text-slate-400">
                  {user?.email} •{' '}
                  {user?.role === 'ADMIN' ? 'Recruiter' : 'Candidate'}
                </p>
              </div>
            </div>
            <p className="max-w-xl text-sm leading-relaxed text-slate-400">
              Build a comprehensive profile. High completeness scores increase
              search indexing rankings and improve AI analysis compatibility
              scores.
            </p>
          </div>

          {/* Completion Progress Gauge */}
          <div className="space-y-2.5 rounded-xl border border-slate-800/80 bg-slate-900/60 p-4 backdrop-blur-sm">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300">
                Profile Completion
              </span>
              <span className="font-bold text-blue-400">
                {completionPercentage}%
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-600 transition-all duration-500 ease-out"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
            <p className="text-center text-[10px] font-medium text-slate-500">
              Completion updates dynamically on save
            </p>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-900/50 bg-emerald-950/40 p-4 text-emerald-300">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
          <span className="text-sm font-medium">{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-3 rounded-xl border border-rose-900/50 bg-rose-950/40 p-4 text-rose-300">
          <AlertCircle className="h-5 w-5 shrink-0 text-rose-400" />
          <span className="text-sm font-medium">{errorMessage}</span>
        </div>
      )}

      {/* Main Form Layout */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
        {/* Navigation Tabs */}
        <div className="space-y-1.5 lg:col-span-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                  isActive
                    ? 'border border-slate-800 bg-slate-900 text-blue-400 shadow-md shadow-blue-950/10'
                    : 'text-slate-400 hover:bg-slate-900/50 hover:text-white'
                }`}
              >
                <Icon
                  className={`h-4.5 w-4.5 ${isActive ? 'text-blue-400' : 'text-slate-400'}`}
                />
                <span>{tab.name}</span>
              </button>
            );
          })}

          <div className="px-2 pt-4">
            <Button
              type="submit"
              disabled={isSubmitting || !isDirty}
              className="w-full cursor-pointer gap-2 bg-gradient-to-r from-blue-600 to-violet-600 font-semibold text-white shadow-lg shadow-blue-500/20 transition-all hover:from-blue-500 hover:to-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Changes
            </Button>
          </div>
        </div>

        {/* Form Fields Panels */}
        <div className="lg:col-span-3">
          <Card className="border-slate-800 bg-slate-900/40 shadow-xl backdrop-blur-sm">
            <CardHeader className="border-b border-slate-800/80 pb-4">
              <CardTitle className="text-lg font-bold text-white">
                {tabs.find((t) => t.id === activeTab)?.name}
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                {activeTab === 'overview' &&
                  'Add headlines, coordinates, contact phone, and professional profiles.'}
                {activeTab === 'skills' &&
                  'Type and add key professional skill words. Dedup is completed on entering.'}
                {activeTab === 'experience' &&
                  'Detail your work history. Set start dates and roles.'}
                {activeTab === 'education' &&
                  'Add your academic qualifications and degrees.'}
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-6">
              {/* Tab 1: Overview */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="headline" className="text-slate-300">
                      Professional Headline
                    </Label>
                    <Input
                      id="headline"
                      placeholder="e.g. Senior Full Stack Engineer"
                      className="border-slate-800 bg-slate-950 text-slate-100 placeholder:text-slate-500 focus-visible:border-blue-500 focus-visible:ring-blue-500/50"
                      {...register('headline')}
                    />
                    {errors.headline && (
                      <p className="text-xs font-semibold text-rose-400">
                        {errors.headline.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio" className="text-slate-300">
                      Bio / Summary
                    </Label>
                    <textarea
                      id="bio"
                      rows={5}
                      placeholder="Share a brief overview of your background, experience, and key strengths..."
                      className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 focus:outline-none"
                      {...register('bio')}
                    />
                    {errors.bio && (
                      <p className="text-xs font-semibold text-rose-400">
                        {errors.bio.message}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="location" className="text-slate-300">
                        Location
                      </Label>
                      <div className="relative">
                        <MapPin className="absolute top-2 left-3 h-4 w-4 text-slate-500" />
                        <Input
                          id="location"
                          placeholder="e.g. San Francisco, CA"
                          className="border-slate-800 bg-slate-950 pl-9 text-slate-100 placeholder:text-slate-500 focus-visible:border-blue-500 focus-visible:ring-blue-500/50"
                          {...register('location')}
                        />
                      </div>
                      {errors.location && (
                        <p className="text-xs font-semibold text-rose-400">
                          {errors.location.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-slate-300">
                        Phone Number
                      </Label>
                      <div className="relative">
                        <Phone className="absolute top-2 left-3 h-4 w-4 text-slate-500" />
                        <Input
                          id="phone"
                          placeholder="e.g. +1 555-019-2834"
                          className="border-slate-800 bg-slate-950 pl-9 text-slate-100 placeholder:text-slate-500 focus-visible:border-blue-500 focus-visible:ring-blue-500/50"
                          {...register('phone')}
                        />
                      </div>
                      {errors.phone && (
                        <p className="text-xs font-semibold text-rose-400">
                          {errors.phone.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4 border-t border-slate-800/80 pt-2">
                    <h3 className="text-sm font-semibold text-slate-200">
                      Social Connections
                    </h3>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="website" className="text-slate-300">
                          Personal Website
                        </Label>
                        <div className="relative">
                          <Globe className="absolute top-2 left-3 h-4 w-4 text-slate-500" />
                          <Input
                            id="website"
                            placeholder="https://yourwebsite.com"
                            className="border-slate-800 bg-slate-950 pl-9 text-slate-100 placeholder:text-slate-500 focus-visible:border-blue-500 focus-visible:ring-blue-500/50"
                            {...register('website')}
                          />
                        </div>
                        {errors.website && (
                          <p className="text-xs font-semibold text-rose-400">
                            {errors.website.message}
                          </p>
                        )}
                      </div>

                      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label
                            htmlFor="linkedin_url"
                            className="text-slate-300"
                          >
                            LinkedIn URL
                          </Label>
                          <div className="relative">
                            <LinkIcon className="absolute top-2 left-3 h-4 w-4 text-slate-500" />
                            <Input
                              id="linkedin_url"
                              placeholder="https://linkedin.com/in/username"
                              className="border-slate-800 bg-slate-950 pl-9 text-slate-100 placeholder:text-slate-500 focus-visible:border-blue-500 focus-visible:ring-blue-500/50"
                              {...register('linkedin_url')}
                            />
                          </div>
                          {errors.linkedin_url && (
                            <p className="text-xs font-semibold text-rose-400">
                              {errors.linkedin_url.message}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label
                            htmlFor="github_url"
                            className="text-slate-300"
                          >
                            GitHub URL
                          </Label>
                          <div className="relative">
                            <LinkIcon className="absolute top-2 left-3 h-4 w-4 text-slate-500" />
                            <Input
                              id="github_url"
                              placeholder="https://github.com/username"
                              className="border-slate-800 bg-slate-950 pl-9 text-slate-100 placeholder:text-slate-500 focus-visible:border-blue-500 focus-visible:ring-blue-500/50"
                              {...register('github_url')}
                            />
                          </div>
                          {errors.github_url && (
                            <p className="text-xs font-semibold text-rose-400">
                              {errors.github_url.message}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Skills */}
              {activeTab === 'skills' && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="skillInput" className="text-slate-300">
                      Add Skill Tags
                    </Label>
                    <div className="flex gap-3">
                      <Input
                        id="skillInput"
                        placeholder="e.g. Node.js"
                        value={skillInput}
                        onChange={(e) => setSkillInput(e.target.value)}
                        onKeyDown={handleSkillKeyDown}
                        className="border-slate-800 bg-slate-950 text-slate-100 placeholder:text-slate-500 focus-visible:border-blue-500 focus-visible:ring-blue-500/50"
                      />
                      <Button
                        type="button"
                        onClick={handleAddSkill}
                        className="cursor-pointer bg-slate-800 font-medium text-white shadow-md hover:bg-slate-700"
                      >
                        Add
                      </Button>
                    </div>
                    {errors.skills && (
                      <p className="text-xs font-semibold text-rose-400">
                        {errors.skills.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-300">
                      Current Skills ({watchedSkills.length}/50)
                    </Label>
                    {watchedSkills.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-800 p-8 text-center text-xs font-medium text-slate-500">
                        No skills added yet. Type a skill and click
                        &quot;Add&quot; to get started.
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2.5 rounded-xl border border-slate-800/80 bg-slate-950/40 p-4">
                        {watchedSkills.map((skill) => (
                          <div
                            key={skill}
                            className="inline-flex items-center gap-1.5 rounded-full border border-blue-900/60 bg-blue-950/40 px-3 py-1.5 text-xs font-semibold text-blue-300"
                          >
                            <span>{skill}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveSkill(skill)}
                              className="cursor-pointer rounded-full p-0.5 transition-colors hover:bg-blue-900/80 hover:text-white"
                            >
                              <Plus className="h-3.5 w-3.5 rotate-45" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 3: Experience */}
              {activeTab === 'experience' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-800/85 pb-2">
                    <span className="text-xs font-semibold text-slate-400">
                      Total Entries: {experienceFields.length}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        appendExperience({
                          company: '',
                          title: '',
                          startDate: '',
                          endDate: '',
                          current: false,
                          description: '',
                        })
                      }
                      className="cursor-pointer gap-1.5 border-slate-800 text-slate-300 hover:text-white"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add Job
                    </Button>
                  </div>

                  {errors.experience && (
                    <p className="text-xs font-semibold text-rose-400">
                      {errors.experience.message}
                    </p>
                  )}

                  {experienceFields.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-800 p-12 text-center text-sm font-medium text-slate-500">
                      No experience records found. Click &quot;Add Job&quot; to
                      start detailing your career path.
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {experienceFields.map((field, index) => {
                        const isCurrent = watch(`experience.${index}.current`);
                        return (
                          <div
                            key={field.id}
                            className="relative space-y-4 rounded-xl border border-slate-800/80 bg-slate-950/40 p-5 shadow-inner"
                          >
                            <button
                              type="button"
                              onClick={() => removeExperience(index)}
                              className="absolute top-4 right-4 cursor-pointer text-slate-500 transition-colors hover:text-rose-400"
                              title="Delete entry"
                            >
                              <Trash2 className="h-4.5 w-4.5" />
                            </button>

                            <div className="grid grid-cols-1 gap-4 pr-6 sm:grid-cols-2">
                              <div className="space-y-1">
                                <Label
                                  htmlFor={`exp-company-${index}`}
                                  className="text-xs text-slate-300"
                                >
                                  Company Name *
                                </Label>
                                <Input
                                  id={`exp-company-${index}`}
                                  placeholder="e.g. Google"
                                  className="border-slate-800 bg-slate-900 text-sm text-slate-100 placeholder:text-slate-500"
                                  {...register(`experience.${index}.company`)}
                                />
                                {errors.experience?.[index]?.company && (
                                  <p className="text-[10px] font-semibold text-rose-400">
                                    {errors.experience[index].company.message}
                                  </p>
                                )}
                              </div>

                              <div className="space-y-1">
                                <Label
                                  htmlFor={`exp-title-${index}`}
                                  className="text-xs text-slate-300"
                                >
                                  Job Title *
                                </Label>
                                <Input
                                  id={`exp-title-${index}`}
                                  placeholder="e.g. Software Engineer"
                                  className="border-slate-800 bg-slate-900 text-sm text-slate-100 placeholder:text-slate-500"
                                  {...register(`experience.${index}.title`)}
                                />
                                {errors.experience?.[index]?.title && (
                                  <p className="text-[10px] font-semibold text-rose-400">
                                    {errors.experience[index].title.message}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                              <div className="space-y-1">
                                <Label
                                  htmlFor={`exp-start-${index}`}
                                  className="text-xs text-slate-300"
                                >
                                  Start Date *
                                </Label>
                                <Input
                                  id={`exp-start-${index}`}
                                  placeholder="e.g. Jan 2021 or 2021-01"
                                  className="border-slate-800 bg-slate-900 text-sm text-slate-100 placeholder:text-slate-500"
                                  {...register(`experience.${index}.startDate`)}
                                />
                                {errors.experience?.[index]?.startDate && (
                                  <p className="text-[10px] font-semibold text-rose-400">
                                    {errors.experience[index].startDate.message}
                                  </p>
                                )}
                              </div>

                              <div className="space-y-1">
                                <Label
                                  htmlFor={`exp-end-${index}`}
                                  className="text-xs text-slate-300"
                                >
                                  End Date
                                </Label>
                                <Input
                                  id={`exp-end-${index}`}
                                  placeholder={
                                    isCurrent
                                      ? 'Current'
                                      : 'e.g. Dec 2022 or 2022-12'
                                  }
                                  disabled={isCurrent}
                                  className="border-slate-800 bg-slate-900 text-sm text-slate-100 placeholder:text-slate-500 disabled:opacity-40"
                                  {...register(`experience.${index}.endDate`)}
                                />
                                {errors.experience?.[index]?.endDate && (
                                  <p className="text-[10px] font-semibold text-rose-400">
                                    {errors.experience[index].endDate.message}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 py-1">
                              <input
                                type="checkbox"
                                id={`exp-curr-${index}`}
                                className="h-4 w-4 rounded border-slate-800 bg-slate-900 text-blue-500 focus:ring-blue-500/30"
                                {...register(`experience.${index}.current`)}
                              />
                              <Label
                                htmlFor={`exp-curr-${index}`}
                                className="cursor-pointer text-xs text-slate-300"
                              >
                                I currently work here
                              </Label>
                            </div>

                            <div className="space-y-1">
                              <Label
                                htmlFor={`exp-desc-${index}`}
                                className="text-xs text-slate-300"
                              >
                                Description
                              </Label>
                              <textarea
                                id={`exp-desc-${index}`}
                                rows={3}
                                placeholder="Describe your achievements and key technologies used..."
                                className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                                {...register(`experience.${index}.description`)}
                              />
                              {errors.experience?.[index]?.description && (
                                <p className="text-[10px] font-semibold text-rose-400">
                                  {errors.experience[index].description.message}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 4: Education */}
              {activeTab === 'education' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-800/85 pb-2">
                    <span className="text-xs font-semibold text-slate-400">
                      Total Entries: {educationFields.length}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        appendEducation({
                          institution: '',
                          degree: '',
                          field: '',
                          startYear: new Date().getFullYear(),
                          endYear: null,
                        })
                      }
                      className="cursor-pointer gap-1.5 border-slate-800 text-slate-300 hover:text-white"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add Degree
                    </Button>
                  </div>

                  {errors.education && (
                    <p className="text-xs font-semibold text-rose-400">
                      {errors.education.message}
                    </p>
                  )}

                  {educationFields.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-800 p-12 text-center text-sm font-medium text-slate-500">
                      No education records found. Click &quot;Add Degree&quot;
                      to document your education qualifications.
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {educationFields.map((field, index) => (
                        <div
                          key={field.id}
                          className="relative space-y-4 rounded-xl border border-slate-800/80 bg-slate-950/40 p-5 shadow-inner"
                        >
                          <button
                            type="button"
                            onClick={() => removeEducation(index)}
                            className="absolute top-4 right-4 cursor-pointer text-slate-500 transition-colors hover:text-rose-400"
                            title="Delete entry"
                          >
                            <Trash2 className="h-4.5 w-4.5" />
                          </button>

                          <div className="grid grid-cols-1 gap-4 pr-6 sm:grid-cols-3">
                            <div className="space-y-1 sm:col-span-1">
                              <Label
                                htmlFor={`edu-inst-${index}`}
                                className="text-xs text-slate-300"
                              >
                                Institution *
                              </Label>
                              <Input
                                id={`edu-inst-${index}`}
                                placeholder="e.g. MIT"
                                className="border-slate-800 bg-slate-900 text-sm text-slate-100 placeholder:text-slate-500"
                                {...register(`education.${index}.institution`)}
                              />
                              {errors.education?.[index]?.institution && (
                                <p className="text-[10px] font-semibold text-rose-400">
                                  {errors.education[index].institution.message}
                                </p>
                              )}
                            </div>

                            <div className="space-y-1">
                              <Label
                                htmlFor={`edu-deg-${index}`}
                                className="text-xs text-slate-300"
                              >
                                Degree *
                              </Label>
                              <Input
                                id={`edu-deg-${index}`}
                                placeholder="e.g. Bachelor of Science"
                                className="border-slate-800 bg-slate-900 text-sm text-slate-100 placeholder:text-slate-500"
                                {...register(`education.${index}.degree`)}
                              />
                              {errors.education?.[index]?.degree && (
                                <p className="text-[10px] font-semibold text-rose-400">
                                  {errors.education[index].degree.message}
                                </p>
                              )}
                            </div>

                            <div className="space-y-1">
                              <Label
                                htmlFor={`edu-field-${index}`}
                                className="text-xs text-slate-300"
                              >
                                Field of Study *
                              </Label>
                              <Input
                                id={`edu-field-${index}`}
                                placeholder="e.g. Computer Science"
                                className="border-slate-800 bg-slate-900 text-sm text-slate-100 placeholder:text-slate-500"
                                {...register(`education.${index}.field`)}
                              />
                              {errors.education?.[index]?.field && (
                                <p className="text-[10px] font-semibold text-rose-400">
                                  {errors.education[index].field.message}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="space-y-1">
                              <Label
                                htmlFor={`edu-syear-${index}`}
                                className="text-xs text-slate-300"
                              >
                                Start Year *
                              </Label>
                              <Input
                                id={`edu-syear-${index}`}
                                type="number"
                                placeholder="e.g. 2017"
                                className="border-slate-800 bg-slate-900 text-sm text-slate-100 placeholder:text-slate-500"
                                {...register(`education.${index}.startYear`)}
                              />
                              {errors.education?.[index]?.startYear && (
                                <p className="text-[10px] font-semibold text-rose-400">
                                  {errors.education[index].startYear.message}
                                </p>
                              )}
                            </div>

                            <div className="space-y-1">
                              <Label
                                htmlFor={`edu-eyear-${index}`}
                                className="text-xs text-slate-300"
                              >
                                End Year (Optional)
                              </Label>
                              <Input
                                id={`edu-eyear-${index}`}
                                type="number"
                                placeholder="e.g. 2021"
                                className="border-slate-800 bg-slate-900 text-sm text-slate-100 placeholder:text-slate-500"
                                {...register(`education.${index}.endYear`)}
                              />
                              {errors.education?.[index]?.endYear && (
                                <p className="text-[10px] font-semibold text-rose-400">
                                  {errors.education[index].endYear.message}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
}
