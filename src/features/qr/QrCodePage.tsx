import { QRCodeSVG } from 'qrcode.react'
import { ArrowLeft } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function QrCodePage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const url = params.get('url') ?? ''

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-4">
      <Button
        variant="ghost"
        size="sm"
        className="w-fit"
        onClick={() => navigate(-1)}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>QR Code</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          {url ? (
            <>
              <div className="rounded-xl border bg-white p-4">
                <QRCodeSVG value={url} size={220} />
              </div>
              <p className="break-all text-center text-xs text-muted-foreground">
                {url}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No URL provided.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
