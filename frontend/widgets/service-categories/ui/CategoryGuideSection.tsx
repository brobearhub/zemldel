import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import type { getCategoryHubNavigation } from "@/entities/service-category/model/category-hubs";
import type { CategoryGuide } from "@/entities/service-category/model/category-guides";
import { getCategoryGuide } from "@/entities/service-category/model/category-guides";
import { getCategoryGuideImage } from "@/entities/service-category/model/category-guide-images";
import styles from "./category-guide.module.css";

type Props = {
  guide: CategoryGuide;
  childrenCategories: Array<{ id: string; name: string; slug: string }>;
  navigation: ReturnType<typeof getCategoryHubNavigation>;
  requestAction: ReactNode;
};

export function CategoryGuideSection({ guide, childrenCategories, navigation, requestAction }: Props) {
  const navigationLinks = [
    ...navigation.situations.map(({ category, situation }) => ({
      href: `/service-categories/${category.id}`,
      title: situation,
    })),
    ...navigation.reading.map(({ category, anchor, title }) => ({
      href: `/service-categories/${category.id}#${anchor}`,
      title,
    })),
    ...(navigation.parent ? [{
      href: `/service-categories/${navigation.parent.id}`,
      title: navigation.parentSituation ?? navigation.parent.name,
    }] : []),
  ];
  const anchors = [
    ...guide.sections.map((section, index) => ({ id: `guide-section-${index + 1}`, title: section.heading })),
    { id: "guide-preparation", title: "Что подготовить для обсуждения" },
    { id: "guide-question", title: guide.question.title },
    ...(childrenCategories.length ? [{ id: "guide-directions", title: "Услуги этого раздела" }] : []),
    ...(navigationLinks.length ? [{ id: "guide-situations", title: "Подберите услугу по ситуации" }] : []),
    { id: "category-offers", title: "Услуги" },
  ];
  return (
    <article
      aria-labelledby="category-title"
      className={styles.article}
    >
      <nav
        aria-label="Содержание статьи"
        className={styles.contents}
      >
        <ol>
          {anchors.map((anchor) => (
            <li key={anchor.id}>
              <Link href={`#${anchor.id}`}>{anchor.title}</Link>
            </li>
          ))}
        </ol>
      </nav>
      {guide.sections.map((section, index) => (
        <section
          id={`guide-section-${index + 1}`}
          className={styles.section}
          key={section.heading}
        >
          <h2 className={styles.heading}>{section.heading}</h2>
          <p className={styles.body}>{section.text}</p>
        </section>
      ))}
      <section
        id="guide-preparation"
        className={`${styles.section} ${styles.preparation}`}
      >
        <h2 className={styles.heading}>Что подготовить для обсуждения</h2>
        <ul>
          {guide.preparation.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </section>
      <section
        id="guide-question"
        className={`${styles.section} ${styles.question}`}
      >
        <h2 className={styles.heading}>{guide.question.title}</h2>
        <p className={styles.body}>{guide.question.answer}</p>
      </section>
      {childrenCategories.length > 0 ? (
        <nav
          id="guide-directions"
          aria-label="Услуги этого раздела"
          className={styles.related}
        >
          <h2 className={styles.heading}>Услуги этого раздела</h2>
          <ul className={styles.cards}>
            {childrenCategories.map((category) => {
              const image = getCategoryGuideImage(category.slug);
              return (
                <li key={category.id}>
                  <Link
                    href={`/service-categories/${category.id}`}
                    className={styles.card}
                  >
                    {image ? (
                      <Image
                        src={image.src}
                        alt={image.alt}
                        width={image.width}
                        height={image.height}
                        sizes="(max-width: 599px) calc(100vw - 72px), (max-width: 899px) 40vw, 320px"
                        className={styles.cardImage}
                      />
                    ) : null}
                    <h3>{category.name}</h3>
                    <p>{getCategoryGuide(category.slug)?.description}</p>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      ) : null}
      <div className={`${styles.nextStepsLayout} ${navigationLinks.length > 0 ? styles.hasHubExtras : ""}`}>
        <section className={styles.nextStep} aria-labelledby="guide-next-step-title">
          <h2 id="guide-next-step-title" className={styles.compactHeading}>Обсудите свою задачу</h2>
          <p className={styles.nextStepIntro}>
            Расскажите об объекте, исходных документах и нужном результате. Если не уверены в выборе услуги,
            опишите ситуацию своими словами.
          </p>
          <div className={styles.actions}>
            {requestAction}
            <Link className={styles.offersLink} href="#category-offers">Предложения</Link>
          </div>
        </section>
        {navigationLinks.length > 0 ? (
          <nav
            id="guide-situations"
            className={styles.hubExtras}
            aria-labelledby="guide-situations-title"
          >
            <h2 id="guide-situations-title" className={styles.compactHeading}>Подберите услугу по ситуации</h2>
            <ul className={styles.situationList}>
              {navigationLinks.map(({ href, title }) => (
                <li key={href}>
                  <Link href={href} className={styles.situationLink}>{title}</Link>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
      </div>
    </article>
  );
}
