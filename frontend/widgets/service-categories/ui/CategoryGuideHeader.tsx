import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import type { CategoryGuide } from "@/entities/service-category/model/category-guides";
import { getCategoryGuideImage } from "@/entities/service-category/model/category-guide-images";
import styles from "./category-guide.module.css";

type Props = {
  title: string;
  slug: string;
  guide: CategoryGuide;
  requestAction: ReactNode;
};

export function CategoryGuideHeader({ title, slug, guide, requestAction }: Props) {
  const image = getCategoryGuideImage(slug);
  return (
    <header className={styles.header}>
      <div>
        <h1
          id="category-title"
          className={styles.title}
        >
          {title}
        </h1>
        <p className={styles.intro}>{guide.intro}</p>
        <div className={styles.actions}>
          {requestAction}
          <Link className={styles.offersLink} href="#category-offers">Предложения</Link>
        </div>
      </div>
      {image ? (
        <figure className={styles.figure}>
          <Image
            src={image.src}
            alt={image.alt}
            width={image.width}
            height={image.height}
            sizes="(max-width: 599px) calc(100vw - 32px), (max-width: 899px) calc(100vw - 48px), (max-width: 1280px) 46vw, 570px"
            priority
            className={styles.cover}
          />
          <figcaption className={styles.caption}>
            {image.caption}
          </figcaption>
        </figure>
      ) : null}
    </header>
  );
}
