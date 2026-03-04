'use server'
 
import { updateTag } from 'next/cache'

export async function invalidate() {
  updateTag('bookings')
}
