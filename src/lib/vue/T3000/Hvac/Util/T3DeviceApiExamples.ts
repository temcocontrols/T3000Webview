/**
 * T3 Device API Usage Examples
 *
 * This file demonstrates how to use the T3DeviceApi class
 * for interacting with T3000 device database APIs
 */

import { t3DeviceApi, T3DeviceApi } from './T3DeviceApi'

/**
 * Example: Using the default instance
 */
export async function exampleUsingDefaultInstance() {
  try {
    // Get all buildings
    const buildings = await t3DeviceApi.getBuildings({ page: 1, per_page: 10 })
    console.log('Buildings:', buildings.data)

    // Get building count
    const buildingCount = await t3DeviceApi.getBuildingsCount()
    console.log('Building count:', buildingCount.count)

    // Create a new building
    const newBuilding = await t3DeviceApi.createRecord('buildings', {
      name: 'New Building',
      address: '123 Main St',
      protocol: 'TCP/IP'
    })
    console.log('Created building:', newBuilding)

    // Update a building
    if (newBuilding.id) {
      const updatedBuilding = await t3DeviceApi.updateRecord('buildings', newBuilding.id, {
        name: 'Updated Building Name'
      })
      console.log('Updated building:', updatedBuilding)
    }

  } catch (error) {
    console.error('API Error:', error)
  }
}

/**
 * Example: Creating a custom instance with different base URL
 */
export async function exampleUsingCustomInstance() {
  const customApi = new T3DeviceApi('http://localhost:9103/')

  try {
    // Get devices with search
    const devices = await customApi.getDevices({
      search: 'T3-BB',
      per_page: 20
    })
    console.log('Filtered devices:', devices.data)

    // Get input points
    const inputPoints = await customApi.getInputPoints()
    console.log('Input points:', inputPoints.data)

  } catch (error) {
    console.error('Custom API Error:', error)
  }
}

/**
 * Example: Working with different table types
 */
export async function exampleWorkingWithTables() {
  try {
    // Get programs count
    const programsCount = await t3DeviceApi.getProgramsCount()
    console.log('Programs count:', programsCount.count)

    // Get schedules
    const schedules = await t3DeviceApi.getSchedules({ page: 1 })
    console.log('Schedules:', schedules.data)

    // Get variables with search
    const variables = await t3DeviceApi.getVariables({
      search: 'temp',
      per_page: 50
    })
    console.log('Temperature variables:', variables.data)

  } catch (error) {
    console.error('Table operations error:', error)
  }
}

/**
 * Example: Generic table operations
 */
export async function exampleGenericOperations() {
  try {
    // Use generic methods for any table
    const customTableData = await t3DeviceApi.getTableRecords('custom_table', {
      page: 1,
      per_page: 10,
      search: 'keyword'
    })
    console.log('Custom table data:', customTableData)

    // Get count for any table
    const customTableCount = await t3DeviceApi.getTableCount('custom_table')
    console.log('Custom table count:', customTableCount.count)

  } catch (error) {
    console.error('Generic operations error:', error)
  }
}
