

class MockData {

  static readonly DeviceList = [
    {
      label: 'All Devices',
      children: [
        {
          label: 'T3-Nano-1030657 (VD)',
          children: [
            { label: 'Quality ingredients' },
            { label: 'Good recipe' }
          ]
        },
        {
          label: 'T3-XX-ESP',
          disabled: true,
          children: [
            { label: 'Prompt attention' },
            { label: 'Professional waiter' }
          ]
        },
        {
          label: 'T3-XX-ESP 2',
          children: [
            { label: 'Happy atmosphere' },
            { label: 'Good table presentation' },
            { label: 'Pleasing decor' }
          ]
        }
      ]
    }
  ]
}

export default MockData
