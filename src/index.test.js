import { vi, describe, test, expect } from 'vitest'
import nodemailer from 'nodemailer'
import sendEmail, { getAssumedCredentials } from './index.js'
import fetch from 'node-fetch'

describe('Email testing', () => {
  vi.mock('@aws-sdk/client-sts')

  test('success Send Email ', async () => {
    const res = await sendEmail({ to: 'example@example.com', subject: 'send Email TEST ', html: '<h1>Email send successfully </h1>' })
    expect(res.status).toBe(200)

    const messageUrl = nodemailer.getTestMessageUrl(res.result.info)
    const html = await fetch(messageUrl).then(response => response.text())
    const regex = /Email send successfully/g
    const found = html.match(regex)[0]
    expect(found).toBe('Email send successfully')
  })

  test('success Send Email with replyTo address ', async () => {
    const res = await sendEmail({ to: 'example@example.com', from: 'test@test.com', subject: 'send Email TEST ', html: '<h1>Email send successfully </h1>', replyTo: 'reply-to@test.com' })
    expect(res.status).toBe(200)

    const messageUrl = nodemailer.getTestMessageUrl(res.result.info)
    const html = await fetch(messageUrl).then(response => response.text())
    const regex = /Email send successfully/g
    const found = html.match(regex)[0]
    expect(found).toBe('Email send successfully')
  })

  test('success Send Email with Attachments', async () => {
    const res = await sendEmail({ to: 'example@example.com', from: 'test@test.com', subject: 'Send Email TEST with Attachment', html: '<h1>Email sent successfully with attachment</h1>', attachments: [{ filename: 'test.txt', content: 'This is the content of the attachment.' }] })
    expect(res.status).toBe(200)

    const messageUrl = nodemailer.getTestMessageUrl(res.result.info)
    const html = await fetch(messageUrl).then(response => response.text())
    const regex = /Email sent successfully with attachment/g
    const found = html.match(regex)[0]
    expect(found).toBe('Email sent successfully with attachment')
  })

  test('Send Email Validation error missing params', async () => {
    await expect(sendEmail({ subject: 'send Email TEST', html: '<h1>Should Not Be Sent </h1>' })).rejects.toThrowError('Missing params: to, subject and html are required.')
  })

  test('Send Email internal server error ', async () => {
    global.process.env = {
      FROM_EMAIL_ADDRESS: 'emailTest',
      AWS_ACCESS_KEY_ID: 'AwsAccessKeyIdTest',
      AWS_SECRET_ACCESS_KEY: 'AwsSecretAccessKeyTest',
      AWS_REGION: 'us-east-1'
    }
    await expect(sendEmail({ to: 'example@example.com', subject: 'send Email TEST ', html: '<h1>Email send successfully </h1>' })).rejects.toThrowError('Email sending error: The security token included in the request is invalid.')
  })

  test('Send Email internal server error missing environment variable ', async () => {
    global.process.env = {
      FROM_EMAIL_ADDRESS: 'emailTest',
      AWS_SECRET_ACCESS_KEY: 'AwsSecretAccessKeyTest'
    }
    await expect(sendEmail({ to: 'example@example.com', subject: 'send Email TEST ', html: '<h1>Email send successfully </h1>' })).rejects.toThrowError('Missing environment variable: AWS_ACCESS_KEY_ID')
  })

  test('getAssumedCredentials internal server error missing environment variable ', async () => {
    global.process.env = {
      AWS_SECRET_ACCESS_KEY: 'AwsSecretAccessKeyTest'
    }
    await expect(getAssumedCredentials({ roleArn: 'roleArn', region: 'region' })).rejects.toThrowError('Missing environment variable: AWS_ACCESS_KEY_ID')
  })

  test('getAssumedCredentials internal server error missing environment variable ', async () => {
    global.process.env = {
      AWS_ACCESS_KEY_ID: 'AWS_ACCESS_KEY_ID'
    }
    await expect(getAssumedCredentials({ roleArn: 'roleArn', region: 'region' })).rejects.toThrowError('Missing environment variable: AWS_SECRET_ACCESS_KEY')
  })
  test('getAssumedCredentials internal server error ', async () => {
    global.process.env = {
      AWS_ACCESS_KEY_ID: 'AwsAccessKeyIdTest',
      AWS_SECRET_ACCESS_KEY: 'AwsSecretAccessKeyTest'
    }
    await expect(getAssumedCredentials({ region: 'region' })).rejects.toThrowError('Missing variable: roleArn')
  })
  test('getAssumedCredentials internal server error ', async () => {
    global.process.env = {
      AWS_ACCESS_KEY_ID: 'AwsAccessKeyIdTest',
      AWS_SECRET_ACCESS_KEY: 'AwsSecretAccessKeyTest'
    }
    await expect(getAssumedCredentials({ roleArn: 'roleArn' })).rejects.toThrowError('Missing variable: region')
  })

  test('getAssumedCredentials returns credentials from STS', async () => {
    global.process.env = {
      AWS_ACCESS_KEY_ID: 'AwsAccessKeyIdTest',
      AWS_SECRET_ACCESS_KEY: 'AwsSecretAccessKeyTest'
    }

    const awsSdkSts = await import('@aws-sdk/client-sts')
    awsSdkSts.STSClient.mockImplementation(() => ({
      send: vi.fn(() =>
        Promise.resolve({
          Credentials: {
            AccessKeyId: 'accessKeyId',
            SecretAccessKey: 'secretAccessKey',
            SessionToken: 'sessionToken'
          }
        })
      )
    }))
    awsSdkSts.AssumeRoleCommand.mockImplementation((args) => args)

    const res = await getAssumedCredentials({
      roleArn: 'roleArn',
      region: 'us-east-1'
    })

    expect(res).toEqual({
      accessKeyId: 'accessKeyId',
      secretAccessKey: 'secretAccessKey',
      sessionToken: 'sessionToken'
    })
  })
})
