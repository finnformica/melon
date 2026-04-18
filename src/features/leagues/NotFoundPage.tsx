import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'

export default function NotFoundPage() {
  return (
    <div className="mx-auto max-w-md text-center">
      <h1 className="text-3xl font-semibold">Page not found</h1>
      <p className="mt-2 text-muted-foreground">
        The page you're looking for doesn't exist.
      </p>
      <Button asChild className="mt-6">
        <Link to="/">Back to leagues</Link>
      </Button>
    </div>
  )
}
