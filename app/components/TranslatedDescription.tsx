'use client'

import { useTranslatedDescription } from '@/app/hooks/useTranslatedDescription'

interface TranslatedDescriptionProps {
  description: string | null | undefined
  descriptionGreek?: string | null | undefined
  className?: string
}

export default function TranslatedDescription({ 
  description, 
  descriptionGreek,
  className 
}: TranslatedDescriptionProps) {
  const { translatedDescription } = useTranslatedDescription(description, descriptionGreek)

  if (!translatedDescription) {
    return null
  }

  // Split by double newlines to preserve paragraphs
  const paragraphs = translatedDescription.split(/\n\n+/).filter(p => p.trim().length > 0)

  return (
    <div className={className}>
      {paragraphs.map((paragraph, index) => (
        <p key={index} className={index > 0 ? 'mt-4' : ''}>
          {paragraph.trim()}
        </p>
      ))}
    </div>
  )
}

