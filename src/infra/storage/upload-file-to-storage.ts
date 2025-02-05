import { env } from '@/env'
import { Upload } from '@aws-sdk/lib-storage'
import { randomUUID } from 'node:crypto'
import { basename, extname } from 'node:path'
import { Readable } from 'node:stream'
import { z } from 'zod'
import { r2 } from './client'

const uploadFileToStorageInput = z.object({
  folder: z.enum(['images', 'downloads']),
  fileName: z.string(),
  contentType: z.string(),
  contentStream: z.instanceof(Readable),
})

type uploadFileToStorageInput = z.infer<typeof uploadFileToStorageInput>

export async function uploadFileToStorage(input: uploadFileToStorageInput) {
  const { folder, contentStream, contentType, fileName } =
    uploadFileToStorageInput.parse(input)

  const fileExtension = extname(fileName)
  const fileNameWithoutExtension = basename(fileName)
  const sanitizedFilename = fileNameWithoutExtension.replace(
    /[^a-zA-Z0-9]/g,
    ''
  )
  const sanitizedFilenameWithExtension = sanitizedFilename.concat(fileExtension)

  const uniqueFileName = `${folder}/${randomUUID()}-${sanitizedFilenameWithExtension}`

  const upload = new Upload({
    client: r2,
    params: {
      Key: uniqueFileName,
      Bucket: env.CLOUDFLARE_BUCKET,
      Body: contentStream,
      ContentType: contentType,
    },
  })

  await upload.done()

  return {
    key: uniqueFileName,
    url: new URL(uniqueFileName, env.CLOUDFLARE_PUBLIC_URL).toString(),
  }
}
