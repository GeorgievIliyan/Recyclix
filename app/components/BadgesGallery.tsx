'use client'

import Image from 'next/image'
import { cn } from '@/lib/utils'
import { Award } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useEffect, useState } from 'react'

export type Badge = {
  id: number
  title?: string
  description?: string
  category?: string
  is_active: boolean
  locked?: boolean
  rarity?: 'common' | 'rare' | 'epic' | 'legendary'
}

type BadgesGalleryProps = {
  userId?: string
  columns?: 2 | 3 | 4 | 5 | 6
  aspectRatio?: 'square' | 'portrait' | 'video'
  showNames?: boolean
  showDescriptions?: boolean
  showRarity?: boolean
  showCategory?: boolean
  className?: string
  badgeClassName?: string
  imageClassName?: string
  onlyActive?: boolean
  title?: string
  description?: string
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
  userId,
  columns = 4,
  aspectRatio = 'square',
  showNames = true,
  showDescriptions = false,
  showRarity = true,
  showCategory = false,
  className,
  badgeClassName,
  imageClassName,
  onlyActive = true,
  title = 'Значки',
  description = 'Твоите постижения',
}: BadgesGalleryProps) {
  const [badges, setBadges] = useState<Badge[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchBadges = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams()
        
        if (onlyActive) params.append('is_active', 'true')
        
        const res = await fetch(`/api/badges?${params.toString()}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache'
          }
        })
        
        if (!res.ok) throw new Error('Failed to fetch badges')

        const data: Badge[] = await res.json()
        
        setBadges(data)
      } catch (err) {
        console.error('❌ Fetch error:', err)
        setError('Грешка при зареждане на значките')
        setBadges([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchBadges()
  }, [userId, onlyActive])

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
        <CardTitle className="flex gap-2 items-center">
          <Award className="w-6 h-6 text-amber-500" />
          <p className="text-2xl">{title}</p>
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className={cn('grid gap-4', gridColsClass)}>
            {Array.from({ length: columns * 2 }).map((_, i) => (
              <BadgeSkeleton key={i} aspectRatio={aspectRatio} />
            ))}
          </div>
        ) : error ? (
          <p className="text-center text-red-500">{error}</p>
        ) : (
          <div className={cn('grid gap-4', gridColsClass)}>
            {badges.map(badge => (
              <BadgeItem
                key={badge.id}
                badge={badge}
                aspectRatio={aspectRatio}
                showName={showNames}
                showDescription={showDescriptions}
                showRarity={showRarity}
                showCategory={showCategory}
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
  showCategory?: boolean
  className?: string
  imageClassName?: string
}

function BadgeItem({
  badge,
  aspectRatio,
  showName,
  showDescription,
  showRarity,
  showCategory = false,
  className,
  imageClassName,
}: BadgeItemProps) {
  const isLocked = badge.locked
  
  const rarity = badge.rarity ?? 'common'

  const imageUrl = `/badges/badge-${badge.id}.png`

  return (
    <div className={cn('group relative', className)}>
      <div
        className={cn(
          'relative overflow-hidden rounded-lg transition-all duration-300',
          aspectRatioClasses[aspectRatio],
          !isLocked && 'hover:scale-105 hover:shadow-lg',
          isLocked && 'opacity-50 grayscale'
        )}
      >
        <div className="relative h-full w-full bg-muted">
          <Image
            src={imageUrl}
            alt={badge.title || `Значка ${badge.id}`}
            fill
            className={cn(
              'object-cover transition-transform duration-300',
              !isLocked && 'group-hover:scale-110',
              imageClassName
            )}
            onError={e => {
              const target = e.target as HTMLImageElement
              target.src = '/badge-placeholder.svg'
            }}
          />
        </div>
      </div>

      {(showName || showDescription || showCategory) && (
        <div className="mt-2 space-y-1">
          {showName && <h3 className="text-sm font-semibold line-clamp-1">{badge.title}</h3>}
          {showCategory && badge.category && <p className="text-xs line-clamp-1">{badge.category}</p>}
          {showDescription && badge.description && <p className="text-xs line-clamp-2">{badge.description}</p>}
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
