'use client'

import Image from 'next/image'
import { cn } from '@/lib/utils'
import { Award } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export type Badge = {
  id: string
  name: string
  description?: string
  image_url: string
  earned_at?: string
  rarity?: 'common' | 'rare' | 'epic' | 'legendary'
  locked?: boolean
}

type BadgesGalleryProps = {
  badges: Badge[] | null
  loading?: boolean
  title?: string
  description?: string
  columns?: 2 | 3 | 4 | 5 | 6
  aspectRatio?: 'square' | 'portrait' | 'video'
  showNames?: boolean
  showDescriptions?: boolean
  showRarity?: boolean
  className?: string
  badgeClassName?: string
  imageClassName?: string
}

const rarityColors = {
  common: 'from-slate-400 to-slate-600',
  rare: 'from-blue-400 to-blue-600',
  epic: 'from-purple-400 to-purple-600',
  legendary: 'from-amber-400 to-amber-600',
}

const aspectRatioClasses = {
  square: 'aspect-square',
  portrait: 'aspect-[3/4]',
  video: 'aspect-video',
}

export function BadgesGallery({
  badges,
  loading = false,
  title = 'Значки',
  description = 'Твоите постижения',
  columns = 4,
  aspectRatio = 'square',
  showNames = true,
  showDescriptions = false,
  showRarity = true,
  className,
  badgeClassName,
  imageClassName,
}: BadgesGalleryProps) {
  const gridColsClass = {
    2: 'grid-cols-2',
    3: 'grid-cols-2 sm:grid-cols-3',
    4: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
    5: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5',
    6: 'grid-cols-3 sm:grid-cols-4 lg:grid-cols-6',
  }[columns]

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <CardTitle className='flex flex-row gap-2 items-center'>
          <Award className='w-6 h-6 text-amber-500'/>
          <p className='text-2xl'>{title}</p>
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className={cn('grid gap-4', gridColsClass)}>
            {Array.from({ length: columns * 2 }).map((_, i) => (
              <BadgeSkeleton key={i} aspectRatio={aspectRatio} />
            ))}
          </div>
        ) : (badges?.length === 0)? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-6 mb-4">
              <svg
                className="h-12 w-12 text-muted-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                />
              </svg>
            </div>
            <p className="text-sm text-muted-foreground">Няма налични значки</p>
          </div>
        ) : (
          <div className={cn('grid gap-4', gridColsClass)}>
            {badges?.map((badge) => (
              <BadgeItem
                key={badge.id}
                badge={badge}
                aspectRatio={aspectRatio}
                showName={showNames}
                showDescription={showDescriptions}
                showRarity={showRarity}
                className={badgeClassName}
                imageClassName={imageClassName}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

type BadgeItemProps = {
  badge: Badge
  aspectRatio: 'square' | 'portrait' | 'video'
  showName: boolean
  showDescription: boolean
  showRarity: boolean
  className?: string
  imageClassName?: string
}

function BadgeItem({
  badge,
  aspectRatio,
  showName,
  showDescription,
  showRarity,
  className,
  imageClassName,
}: BadgeItemProps) {
  const isLocked = badge.locked ?? false
  const rarity = badge.rarity ?? 'common'

  return (
    <div className={cn('group relative', className)}>
      <div
        className={cn(
          'relative overflow-hidden rounded-lg transition-all duration-300',
          aspectRatioClasses[aspectRatio],
          !isLocked && 'hover:scale-105 hover:shadow-lg',
          isLocked && 'opacity-50 grayscale',
        )}
      >
        {!isLocked && showRarity && (
          <div
            className={cn(
              'absolute inset-0 rounded-lg bg-gradient-to-br p-[2px] opacity-0 transition-opacity duration-300 group-hover:opacity-100',
              rarityColors[rarity],
            )}
          >
            <div className="h-full w-full rounded-lg bg-background" />
          </div>
        )}

        {/* Изображение на значката */}
        <div className="relative h-full w-full bg-muted">
          <Image
            src={badge.image_url || "/placeholder.svg"}
            alt={badge.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className={cn(
              'object-cover transition-transform duration-300',
              !isLocked && 'group-hover:scale-110',
              imageClassName,
            )}
          />
        </div>

        {/* при заключена значка*/}
        {isLocked && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <svg
              className="h-8 w-8 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
        )}

        {/* рядкост */}
        {!isLocked && showRarity && rarity !== 'common' && (
          <div
            className={cn(
              'absolute top-2 right-2 rounded-full bg-gradient-to-br px-2 py-1 text-xs font-semibold text-white shadow-lg',
              rarityColors[rarity],
            )}
          >
            {rarity === 'rare' && 'Рядък'}
            {rarity === 'epic' && 'Епичен'}
            {rarity === 'legendary' && 'Легендарен'}
          </div>
        )}
      </div>

      {/* инфромация */}
      {(showName || showDescription) && (
        <div className="mt-2 space-y-1">
          {showName && (
            <h3 className="text-sm font-semibold text-foreground line-clamp-1">
              {badge.name}
            </h3>
          )}
          {showDescription && badge.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">
              {badge.description}
            </p>
          )}
          {badge.earned_at && (
            <p className="text-xs text-muted-foreground">
              Получен на{' '}
              {new Date(badge.earned_at).toLocaleDateString('bg-BG', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function BadgeSkeleton({ aspectRatio }: { aspectRatio: 'square' | 'portrait' | 'video' }) {
  return (
    <div className="space-y-2">
      <Skeleton className={cn('w-full rounded-lg', aspectRatioClasses[aspectRatio])} />
      <Skeleton className="h-4 w-3/4" />
    </div>
  )
}
