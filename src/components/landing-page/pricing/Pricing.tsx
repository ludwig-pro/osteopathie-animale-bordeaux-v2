import { prestations } from '../../../lib/content/pricing';
import { useState } from 'react';
import type { ResponsiveImageData } from '../../../lib/responsiveImage';
import { Card, CardContent } from '../../ui/card';
import { Tabs, TabsList, TabsTrigger } from '../../ui/tabs';
import SectionHeading from '../../site/SectionHeading';

type PricingProps = {
  id?: string;
  chienetchatImg: ResponsiveImageData;
  furetImg: ResponsiveImageData;
  chevalImg: ResponsiveImageData;
  forfaitImg: ResponsiveImageData;
};

export default function Pricing({
  id = 'tarifs',
  chienetchatImg,
  furetImg,
  chevalImg,
  forfaitImg,
}: PricingProps) {
  const [option, setOption] = useState('cabinet');
  const images = {
    chienetchat: chienetchatImg,
    furet: furetImg,
    cheval: chevalImg,
    forfait: forfaitImg,
  };
  return (
    <section id={id} className="pricing-section section-space">
      <div className="site-container">
        <Tabs value={option} onValueChange={setOption}>
          <div className="pricing-topline">
            <SectionHeading
              eyebrow="Tout simplement"
              title="Des tarifs clairs."
              description="Choisissez le lieu de consultation pour connaître les modalités."
            />
            <TabsList aria-label="Lieu de consultation">
              <TabsTrigger
                value="cabinet"
                id="pricing-tab-cabinet"
                aria-controls="pricing-panel"
              >
                En cabinet
              </TabsTrigger>
              <TabsTrigger
                value="domicile"
                id="pricing-tab-domicile"
                aria-controls="pricing-panel"
              >
                À domicile
              </TabsTrigger>
            </TabsList>
          </div>
          <div
            id="pricing-panel"
            role="tabpanel"
            aria-labelledby={`pricing-tab-${option}`}
            tabIndex={0}
            className="mt-9"
          >
            <div className="pricing-grid">
              {prestations.map(
                ({
                  id,
                  title,
                  alt,
                  imageKey,
                  basePrice,
                  domicilePrice,
                  variants,
                }) => (
                  <Card key={id} className="price-card">
                    <img
                      {...images[imageKey]}
                      alt={alt}
                      loading="lazy"
                      decoding="async"
                      data-testid="responsive-content-image"
                    />
                    <CardContent className="price-card-body">
                      <div className="price-label">
                        <h3>{title}</h3>
                        {id === 'forfait' && (
                          <div className="price-package">
                            <p>Éleveurs à partir de 3 animaux</p>
                            <p>Visite mensuelle</p>
                            <p>Rééducation</p>
                          </div>
                        )}
                      </div>
                      <div className="price-values">
                        {variants ? (
                          variants.map((variant) => (
                            <p className="price-line" key={variant.description}>
                              <span>{variant.description}</span>
                              <strong>
                                {option === 'cabinet'
                                  ? variant.basePrice
                                  : variant.domicilePrice}
                                <small> €{option === 'domicile' && '*'}</small>
                              </strong>
                            </p>
                          ))
                        ) : (
                          <p className="price-line">
                            <span>La consultation</span>
                            <strong>
                              {option === 'cabinet' ? basePrice : domicilePrice}
                              <small> €{option === 'domicile' && '*'}</small>
                            </strong>
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              )}
            </div>
            {option === 'domicile' && (
              <p className="pricing-note">
                *Pour votre confort, je me déplace à votre domicile sur toute la
                région bordelaise. Un forfait déplacement de{' '}
                <strong>10€</strong> s'applique, vous permettant de profiter
                d'une consultation dans l'environnement familier de votre
                animal.
              </p>
            )}
          </div>
        </Tabs>
      </div>
    </section>
  );
}
