import nodemailer from 'nodemailer'
import sendEmail from './index.js'
import fetch from 'node-fetch'

describe('Email testing', () => {
  test('success Send Email ', async () => {
    const res = await sendEmail({ to: 'example@example.com', subject: 'send Email TEST ', html: '<h1>Email send successfully </h1>' })
    expect(res.status).toBe(200)

    const messageUrl = nodemailer.getTestMessageUrl(res.result.info)
    const html = await fetch(messageUrl).then(response => response.text())
    const regex = /Email send successfully/g
    const found = html.match(regex)[0]
    expect(found).toBe('Email send successfully')
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
})
