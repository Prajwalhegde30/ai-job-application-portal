'use client';

import { useState } from 'react';
import {
  ExtractedSkill,
  ExtractedEducation,
  ExtractedExperience,
  ExtractedProject,
  ExtractedCertification,
  ContactInformation,
} from '@/hooks/useAIAnalysis';

interface ExtractedDetailsProps {
  skills: ExtractedSkill[];
  education: ExtractedEducation[];
  experience: ExtractedExperience[];
  projects: ExtractedProject[];
  certifications: ExtractedCertification[];
  contact: ContactInformation;
}

type TabType =
  | 'skills'
  | 'experience'
  | 'projects'
  | 'education'
  | 'certifications'
  | 'contact';

export default function ExtractedDetails({
  skills,
  education,
  experience,
  projects,
  certifications,
  contact,
}: ExtractedDetailsProps) {
  const [activeTab, setActiveTab] = useState<TabType>('skills');

  // Group skills by category
  const skillsByCategory = skills.reduce(
    (acc, skill) => {
      const cat = skill.category || 'Other';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(skill.name);
      return acc;
    },
    {} as Record<string, string[]>
  );

  const tabs: { id: TabType; label: string; count?: number }[] = [
    { id: 'skills', label: 'Extracted Skills', count: skills.length },
    { id: 'experience', label: 'Experience', count: experience.length },
    { id: 'projects', label: 'Projects', count: projects.length },
    { id: 'education', label: 'Education', count: education.length },
    {
      id: 'certifications',
      label: 'Certifications',
      count: certifications.length,
    },
    { id: 'contact', label: 'Contact Info' },
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-xl backdrop-blur-md">
      {/* Tab Switcher Headers */}
      <div className="flex flex-wrap border-b border-white/10 bg-neutral-900/40">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 border-b-2 px-6 py-4 text-sm font-semibold transition-all ${
              activeTab === tab.id
                ? 'border-indigo-500 bg-indigo-500/10 text-white'
                : 'border-transparent text-neutral-400 hover:bg-white/5 hover:text-neutral-200'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${
                  activeTab === tab.id
                    ? 'bg-indigo-500 text-white'
                    : 'bg-neutral-800 text-neutral-400'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content Panels */}
      <div className="p-6">
        {/* SKILLS TAB */}
        {activeTab === 'skills' && (
          <div className="space-y-6">
            {Object.keys(skillsByCategory).length === 0 ? (
              <p className="text-sm text-neutral-400">No skills parsed.</p>
            ) : (
              Object.entries(skillsByCategory).map(([category, names]) => (
                <div key={category} className="space-y-2">
                  <h4 className="text-xs font-extrabold tracking-wider text-neutral-400 uppercase">
                    {category}s
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {names.map((name) => (
                      <span
                        key={name}
                        className="rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-300"
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* EXPERIENCE TAB */}
        {activeTab === 'experience' && (
          <div className="relative space-y-8 before:absolute before:top-2 before:bottom-2 before:left-3 before:w-0.5 before:bg-neutral-800">
            {experience.length === 0 ? (
              <p className="pl-6 text-sm text-neutral-400">
                No experience entries found.
              </p>
            ) : (
              experience.map((exp, idx) => (
                <div key={idx} className="relative pl-8">
                  {/* Timeline bullet dot */}
                  <div className="absolute top-1.5 left-1.5 h-3.5 w-3.5 -translate-x-1/2 transform rounded-full border border-neutral-900 bg-indigo-500 shadow-md" />

                  <div>
                    <h4 className="text-md font-bold text-white">
                      {exp.role || 'Professional Role'}
                    </h4>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-neutral-400">
                      <span className="font-semibold text-indigo-400">
                        {exp.company || 'Unknown Company'}
                      </span>
                      {exp.duration && (
                        <>
                          <span className="text-neutral-600">•</span>
                          <span>{exp.duration}</span>
                        </>
                      )}
                    </div>

                    {exp.achievements && exp.achievements.length > 0 && (
                      <ul className="mt-3 list-disc space-y-2 pl-4 text-sm text-neutral-300">
                        {exp.achievements.map((ach, aIdx) => {
                          // Highlight quantified numbers/metrics in bold
                          const metricRegex =
                            /(\b\d+%\b|\b\d+\s*(?:percent|x|fold)\b|\b(?:\$|USD)\s*\d+(?:\.\d+)?[kKmMbB]?\b)/gi;
                          const parts = ach.split(metricRegex);
                          return (
                            <li key={aIdx} className="leading-relaxed">
                              {parts.map((part, pIdx) =>
                                metricRegex.test(part) ? (
                                  <strong
                                    key={pIdx}
                                    className="rounded bg-emerald-400/10 px-1 font-extrabold text-emerald-400"
                                  >
                                    {part}
                                  </strong>
                                ) : (
                                  part
                                )
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* PROJECTS TAB */}
        {activeTab === 'projects' && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {projects.length === 0 ? (
              <p className="col-span-2 text-sm text-neutral-400">
                No projects found.
              </p>
            ) : (
              projects.map((proj, idx) => (
                <div
                  key={idx}
                  className="flex flex-col justify-between rounded-xl border border-white/5 bg-white/5 p-5"
                >
                  <div>
                    <div className="flex items-start justify-between gap-4">
                      <h4 className="text-md font-bold text-white">
                        {proj.projectName || 'Project Name'}
                      </h4>
                      {proj.githubLink && (
                        <a
                          href={proj.githubLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300"
                        >
                          <svg
                            className="h-4 w-4"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              fillRule="evenodd"
                              d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.137 20.162 22 16.418 22 12c0-5.523-4.477-10-10-10z"
                              clipRule="evenodd"
                            />
                          </svg>
                          GitHub
                        </a>
                      )}
                    </div>
                    {proj.description && (
                      <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-neutral-300">
                        {proj.description}
                      </p>
                    )}
                  </div>

                  {proj.techStack && proj.techStack.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {proj.techStack.map((tech) => (
                        <span
                          key={tech}
                          className="rounded bg-neutral-800 px-2 py-0.5 text-[10px] font-semibold text-neutral-300 uppercase"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* EDUCATION TAB */}
        {activeTab === 'education' && (
          <div className="space-y-6">
            {education.length === 0 ? (
              <p className="text-sm text-neutral-400">
                No education entries found.
              </p>
            ) : (
              education.map((edu, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-white/5 bg-white/5 p-5"
                >
                  <h4 className="text-md font-bold text-white">
                    {edu.degree || 'Degree details'}
                  </h4>
                  <p className="mt-1 text-sm font-semibold text-indigo-400">
                    {edu.university || 'University/Institution'}
                  </p>
                  <div className="mt-3 flex gap-4 text-xs font-semibold text-neutral-400">
                    {edu.graduationYear && (
                      <span>Graduation: {edu.graduationYear}</span>
                    )}
                    {edu.gpa !== undefined && (
                      <span className="text-emerald-400">
                        GPA/CGPA: {edu.gpa}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* CERTIFICATIONS TAB */}
        {activeTab === 'certifications' && (
          <div className="space-y-4">
            {certifications.length === 0 ? (
              <p className="text-sm text-neutral-400">
                No certifications matched.
              </p>
            ) : (
              certifications.map((cert, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 p-4"
                >
                  <div>
                    <h4 className="text-sm font-bold text-white">
                      {cert.name}
                    </h4>
                    {cert.provider && (
                      <span className="mt-1 block text-xs font-semibold text-indigo-400">
                        Provider: {cert.provider}
                      </span>
                    )}
                  </div>
                  {cert.date && (
                    <span className="text-xs font-semibold text-neutral-400">
                      {cert.date}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* CONTACT INFO TAB */}
        {activeTab === 'contact' && (
          <div className="space-y-6">
            <h4 className="text-md mb-2 font-bold text-white">
              Contact Completeness Checklist
            </h4>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {[
                {
                  name: 'Email Address',
                  value: contact.email,
                  label: contact.email || 'Missing email address',
                },
                {
                  name: 'Phone Number',
                  value: contact.phone,
                  label: contact.phone || 'Missing phone number',
                },
                {
                  name: 'LinkedIn URL',
                  value: contact.linkedin,
                  label: contact.linkedin || 'Missing LinkedIn profile',
                },
                {
                  name: 'GitHub Link',
                  value: contact.github,
                  label: contact.github || 'Missing GitHub profile',
                },
                {
                  name: 'Portfolio Website',
                  value: contact.portfolio,
                  label: contact.portfolio || 'Missing portfolio link',
                },
              ].map((item) => (
                <div
                  key={item.name}
                  className={`flex items-start gap-3 rounded-xl border p-4 ${
                    item.value
                      ? 'border-emerald-500/20 bg-emerald-950/15 text-emerald-300'
                      : 'border-red-500/20 bg-red-950/15 text-red-300'
                  }`}
                >
                  <div className="mt-0.5">
                    {item.value ? (
                      <svg
                        className="h-5 w-5 text-emerald-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="h-5 w-5 text-red-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    )}
                  </div>
                  <div>
                    <span className="block text-xs font-extrabold tracking-wide text-neutral-400 uppercase">
                      {item.name}
                    </span>
                    {item.value ? (
                      <a
                        href={
                          item.value.startsWith('http') ||
                          item.name.includes('Email')
                            ? item.name.includes('Email')
                              ? `mailto:${item.value}`
                              : item.value
                            : `https://${item.value}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 block text-sm font-semibold break-all hover:underline"
                      >
                        {item.label}
                      </a>
                    ) : (
                      <span className="mt-1 block text-sm text-neutral-400">
                        {item.label}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
