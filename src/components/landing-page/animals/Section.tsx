type ImageData = {
  src: string;
  srcSet: {
    attribute: string;
  };
  attributes?: Record<string, unknown>;
};

type SectionProps = {
  name: string;
  text: string;
  imageKey: string;
  alt: string;
  imageData: ImageData;
};

export default function Section({ name, text, alt, imageData }: SectionProps) {
  return (
    <>
      <div className="mt-6">
        <h3 className="text-2xl font-extrabold tracking-tight text-gold-600">
          {name}
        </h3>
        <p className="mt-2 text-base text-white">{text}</p>
      </div>
      <div className="mt-12 sm:mt-16 lg:mt-0">
        <div className="-mr-48 sm:pl-6 md:-mr-16 lg:px-0 lg:m-0 lg:relative lg:h-full">
          <img
            src={imageData.src}
            srcSet={imageData.srcSet.attribute}
            alt={alt}
            loading="lazy"
            decoding="async"
            className="w-full rounded-xl shadow-xl ring-1 ring-black ring-opacity-5 lg:absolute lg:left-0 lg:h-full lg:max-w-none object-cover"
          />
        </div>
      </div>
    </>
  );
}
