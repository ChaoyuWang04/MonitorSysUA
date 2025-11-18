'use client'

import { useState } from 'react'
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Divider,
} from '@mui/material'
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  EventNote as EventNoteIcon,
  AccountCircle as AccountIcon,
} from '@mui/icons-material'
import { usePathname, useRouter } from 'next/navigation'
import { AccountSelector } from '@/components/layout/account-selector'

const drawerWidth = 280

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen)
  }

  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
    { text: 'Events', icon: <EventNoteIcon />, path: '/events' },
    { text: 'Accounts', icon: <AccountIcon />, path: '/accounts' },
  ]

  const drawer = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* App Title */}
      <Toolbar sx={{ minHeight: '64px' }}>
        <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 600, color: 'primary.main' }}>
          MonitorSysUA
        </Typography>
      </Toolbar>
      <Divider />

      {/* Account Selector */}
      <Box sx={{ py: 1 }}>
        <AccountSelector />
      </Box>

      <Divider />

      {/* Navigation Menu */}
      <List sx={{ flex: 1, pt: 2, px: 1 }}>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              selected={pathname === item.path}
              onClick={() => {
                router.push(item.path)
                setMobileOpen(false)
              }}
              sx={{ mb: 0.5 }}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText
                primary={item.text}
                primaryTypographyProps={{
                  fontSize: '0.9375rem',
                  fontWeight: pathname === item.path ? 600 : 400,
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex' }}>
      {/* Skip to main content link for accessibility (WCAG 2.4.1) */}
      <Box
        component="a"
        href="#main-content"
        sx={{
          position: 'absolute',
          left: '-9999px',
          top: 0,
          zIndex: 9999,
          padding: '8px 16px',
          backgroundColor: 'primary.main',
          color: 'white',
          textDecoration: 'none',
          borderRadius: '0 0 4px 4px',
          fontWeight: 600,
          fontSize: '0.875rem',
          '&:focus': {
            left: '16px',
            top: '16px',
          },
        }}
      >
        Skip to main content
      </Box>

      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div">
            Google Ads Change Event Monitor
          </Typography>
        </Toolbar>
      </AppBar>

      {/* Mobile drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true, // Better mobile performance
        }}
        sx={{
          display: { xs: 'block', sm: 'none' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
        }}
      >
        {drawer}
      </Drawer>

      {/* Desktop drawer */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', sm: 'block' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
        }}
        open
      >
        {drawer}
      </Drawer>

      {/* Main content */}
      <Box
        component="main"
        id="main-content"
        sx={{
          flexGrow: 1,
          p: 3, // 24px padding (Material Design 8dp grid: 3 * 8 = 24)
          ml: { sm: `${drawerWidth}px` }, // Critical fix: offset for permanent drawer
        }}
      >
        <Toolbar /> {/* Spacer for AppBar */}
        {children}
      </Box>
    </Box>
  )
}
