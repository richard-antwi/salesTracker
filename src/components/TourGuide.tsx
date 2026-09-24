'use client';

import { useEffect, useRef } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

interface TourGuideProps {
  agreementsCount: number;
}

export default function TourGuide({ agreementsCount }: TourGuideProps) {
  const hasRun = useRef(false);

  useEffect(() => {
    if (agreementsCount === 0 && !hasRun.current) {
      const hasSeenTour = localStorage.getItem('has_seen_tour');
      
      if (!hasSeenTour) {
        hasRun.current = true;
        
        // Small delay to allow the page to render completely
        setTimeout(() => {
          const driverObj = driver({
            showProgress: true,
            animate: true,
            popoverClass: 'driverjs-theme', // We can add custom CSS if needed
            steps: [
              {
                element: 'body',
                popover: {
                  title: 'Welcome to Work & Pay! 🎉',
                  description: 'This quick tour will show you around your new Fleet Dashboard. We will cover the most important features after signup.',
                  side: 'center',
                  align: 'center',
                }
              },
              {
                element: '#tour-new-agreement',
                popover: {
                  title: 'Add a Motorcycle',
                  description: 'Start here! Click this button to register your first motorcycle, set up financial terms, and link a rider.',
                  side: 'bottom',
                  align: 'start',
                }
              },
              {
                element: '#tour-record-payment',
                popover: {
                  title: 'Record Payments',
                  description: 'Once you have active agreements, use this button to quickly log cash, bank, or mobile money payments.',
                  side: 'bottom',
                  align: 'start',
                }
              },
              {
                element: '#tour-metrics',
                popover: {
                  title: 'Portfolio Health Overview',
                  description: 'These metrics show your total collected revenue, outstanding balances, and highlight any riders who are falling behind.',
                  side: 'bottom',
                  align: 'center',
                }
              },
              {
                element: '#tour-agreements-list',
                popover: {
                  title: 'Track Every Detail',
                  description: 'Your active agreements will appear here. You can click into any agreement to view statements, track live progress, and manage documents.',
                  side: 'top',
                  align: 'center',
                }
              }
            ],
            onDestroyStarted: () => {
              if (driverObj.hasNextStep() || confirm("Are you sure you want to skip the rest of the tour?")) {
                localStorage.setItem('has_seen_tour', 'true');
                driverObj.destroy();
              }
            },
          });

          driverObj.drive();
        }, 1000);
      }
    }
  }, [agreementsCount]);

  // We don't render anything, driver.js handles the overlay
  return null;
}
