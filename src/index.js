import nodemailer from 'nodemailer'
import aws from '@aws-sdk/client-ses'
import createTextVersion from 'textversionjs'

import { ValidationError, InternalServerError } from 'standard-api-errors'

/*
  Add the following to your .env file:
    FROM_EMAIL_ADDRESS
    AWS_ACCESS_KEY_ID
    AWS_SECRET_ACCESS_KEY
    AWS_REGION
*/

export default async ({ to, subject, html, from, replyTo, attachments, awsSecretAccessKey, awsAccessKeyId, awsSessionToken, region, headers }) => {
  try {
    if (!to || !subject || !html) {
      throw new ValidationError('Missing params: to, subject and html are required.')
    }
    let transporter
    if (process.env.NODE_ENV === 'test') {
      const testAccount = await nodemailer.createTestAccount()
      transporter = await nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      })
      /* c8 ignore next 30 */
    } else {
      if (!from && !process.env.FROM_EMAIL_ADDRESS) {
        throw new InternalServerError('Missing environment variable: FROM_EMAIL_ADDRESS')
      }
      if (!awsAccessKeyId && !process.env.AWS_ACCESS_KEY_ID) {
        throw new InternalServerError('Missing environment variable: AWS_ACCESS_KEY_ID')
      }
      if (!awsSecretAccessKey && !process.env.AWS_SECRET_ACCESS_KEY) {
        throw new InternalServerError('Missing environment variable: AWS_SECRET_ACCESS_KEY')
      }
      if (!region && !process.env.AWS_REGION) {
        throw new InternalServerError('Missing environment variable: AWS_REGION')
      }
      const credentials = {
        accessKeyId: awsAccessKeyId || process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: awsSecretAccessKey || process.env.AWS_SECRET_ACCESS_KEY
      }
      if (awsSessionToken) {
        credentials.sessionToken = awsSessionToken
      }
      const sesClient = new aws.SESClient({
        region: region || process.env.AWS_REGION,
        credentials
      })
      transporter = nodemailer.createTransport({
        SES: { ses: sesClient, aws }
      })
    }
    const info = await transporter.sendMail({
      from: from || process.env.FROM_EMAIL_ADDRESS,
      to,
      subject,
      html,
      replyTo,
      attachments,
      headers,
      text: createTextVersion(html)
    })
    return {
      status: 200,
      result: {
        info
      }
    }
  } catch (err) {
    if (err.name !== 'VALIDATION_ERROR' && err.name !== 'INTERNAL_SERVER_ERROR') {
      throw new InternalServerError(`Email sending error: ${err.message}`)
    }
    throw err
  }
}

export { getAssumedCredentials }
