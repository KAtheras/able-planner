import type { ReactNode } from "react";

type ResourceLink = {
  label: string;
  url: string;
};

type ResourceSection = {
  title: string;
  paragraphs: string[];
  items: string[];
  links: ResourceLink[];
};

type ResourcesSectionProps = {
  resourcesTitle: string;
  resourcesIntro: string;
  resourcesSections: unknown[];
  placeholderText: string;
  languageToggle: ReactNode;
  onOpenExternalUrl: (url: string) => void;
};

function normalizeResourceSection(section: unknown): ResourceSection | null {
  const sectionValue = section as {
    title?: unknown;
    paragraphs?: unknown;
    items?: unknown;
    links?: unknown;
  };
  const title = typeof sectionValue.title === "string" ? sectionValue.title : "";
  const paragraphs = Array.isArray(sectionValue.paragraphs)
    ? sectionValue.paragraphs.filter(
        (item: unknown): item is string => typeof item === "string" && item.trim().length > 0,
      )
    : [];
  const items = Array.isArray(sectionValue.items)
    ? sectionValue.items.filter(
        (item: unknown): item is string => typeof item === "string" && item.trim().length > 0,
      )
    : [];
  const links = Array.isArray(sectionValue.links)
    ? sectionValue.links.filter(
        (link): link is ResourceLink =>
          typeof link?.label === "string" &&
          link.label.trim().length > 0 &&
          typeof link?.url === "string" &&
          link.url.trim().length > 0,
      )
    : [];

  if (!title && paragraphs.length === 0 && items.length === 0 && links.length === 0) return null;
  return { title, paragraphs, items, links };
}

export default function ResourcesSection({
  resourcesTitle,
  resourcesIntro,
  resourcesSections,
  placeholderText,
  languageToggle,
  onOpenExternalUrl,
}: ResourcesSectionProps) {
  const normalizedSections = resourcesSections
    .map((section) => normalizeResourceSection(section))
    .filter((section): section is ResourceSection => section !== null);

  return (
    <div className="space-y-2 md:space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-lg font-semibold uppercase text-zinc-900 dark:text-zinc-50">
          {resourcesTitle}
        </h1>
        <div>{languageToggle}</div>
      </div>
      <div className="h-full rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm text-sm text-zinc-600 dark:border-zinc-800 dark:bg-black dark:text-zinc-400">
        <div className="max-h-[calc(100vh-16rem)] space-y-2 overflow-y-auto pr-1 md:max-h-[calc(100vh-13rem)] md:space-y-3">
          {resourcesIntro ? (
            <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
              {resourcesIntro}
            </p>
          ) : null}
          {normalizedSections.map((section, index) => (
            <div
              key={`${section.title || "resources-section"}-${index}`}
              className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-black/80"
            >
              {section.title ? (
                <h2 className="mb-3 text-base font-semibold text-zinc-900 dark:text-zinc-100">
                  {section.title}
                </h2>
              ) : null}
              {section.paragraphs.map((paragraph, paragraphIndex) => (
                <p
                  key={`${section.title || "resources"}-paragraph-${paragraphIndex}`}
                  className="mb-3 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300 last:mb-0"
                >
                  {paragraph}
                </p>
              ))}
              {section.items.length > 0 ? (
                <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                  {section.items.map((item, itemIndex) => (
                    <li key={`${section.title || "resources"}-item-${itemIndex}`}>{item}</li>
                  ))}
                </ul>
              ) : null}
              {section.links.length > 0 ? (
                <ul className="mt-4 space-y-1.5 text-sm leading-relaxed">
                  {section.links.map((link, linkIndex) => (
                    <li key={`${section.title || "resources"}-link-${linkIndex}`}>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(event) => {
                          event.preventDefault();
                          onOpenExternalUrl(link.url);
                        }}
                        className="font-medium text-blue-600 underline decoration-blue-600/50 underline-offset-2 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ))}
          {normalizedSections.length === 0 ? (
            <div className="rounded-xl border border-zinc-200 bg-white p-6 text-sm leading-relaxed text-zinc-700 dark:border-zinc-800 dark:bg-black/80 dark:text-zinc-300">
              {placeholderText}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
