import type { SupportedLocale } from "@/lib/i18n"
import type { DailyCare } from "@/lib/types"

export interface CareGuideGroup {
  title?: string
  items: string[]
  ordered?: boolean
}

export interface CareGuideSection {
  title: string
  careType?: DailyCare["care_type"]
  intro?: string
  groups: CareGuideGroup[]
  notes?: string[]
}

interface CareGuideContent {
  daily: {
    preparation: CareGuideSection
    sections: CareGuideSection[]
    orderLabel: string
    order: string
  }
  bath: {
    sections: CareGuideSection[]
    orderLabel: string
    order: string
  }
}

const fr: CareGuideContent = {
  daily: {
    preparation: {
      title: "1. Préparation",
      groups: [
        {
          items: [
            "Se laver les mains.",
            "Préparer du sérum physiologique en dosettes.",
            "Préparer des compresses stériles ou non tissées.",
            "Préparer du coton permettant de faire de petites fusettes ou mèches.",
            "Préparer de l’eau tiède et une serviette propre."
          ]
        }
      ]
    },
    sections: [
      {
        title: "2. 👁️ Yeux",
        careType: "eyes",
        groups: [
          { title: "Matériel", items: ["2 compresses, une différente pour chaque œil.", "Sérum physiologique."] },
          {
            title: "Étapes",
            ordered: true,
            items: [
              "Imbiber une compresse de sérum physiologique.",
              "Nettoyer doucement de l’extérieur de l’œil vers l’intérieur, en direction du nez.",
              "Ne faire idéalement qu’un passage avec la même face de la compresse.",
              "Jeter la compresse.",
              "Faire l’autre œil avec une nouvelle compresse."
            ]
          }
        ],
        notes: ["Le sens extérieur → intérieur est celui recommandé actuellement par l’Assurance Maladie."]
      },
      {
        title: "3. 🙂 Visage",
        careType: "face",
        groups: [
          { title: "Matériel", items: ["Compresse propre ou coton doux.", "Eau tiède."] },
          {
            title: "Étapes",
            ordered: true,
            items: [
              "Humidifier la compresse ou le coton avec de l’eau tiède.",
              "Nettoyer le front, les joues, le contour de la bouche et le menton.",
              "Nettoyer derrière les oreilles et les plis du cou si nécessaire.",
              "Sécher en tamponnant, sans frotter."
            ]
          }
        ],
        notes: ["Pour le visage, de l’eau tiède suffit généralement."]
      },
      {
        title: "4. 👃 Nez",
        careType: "nose",
        groups: [
          { title: "Matériel", items: ["2 petites fusettes ou mèches de coton.", "Sérum physiologique."] },
          {
            title: "Étapes",
            ordered: true,
            items: [
              "Rouler une petite quantité de coton entre les doigts pour former une fusette fine.",
              "L’imbiber légèrement de sérum physiologique.",
              "Introduire uniquement l’extrémité dans l’entrée de la narine.",
              "Faire tourner doucement pour récupérer les sécrétions.",
              "Jeter la fusette.",
              "Recommencer avec une nouvelle fusette pour l’autre narine."
            ]
          }
        ],
        notes: [
          "Ne pas chercher à aller profondément dans la narine.",
          "Si le nez est réellement encombré, les fusettes ne remplacent pas un lavage de nez au sérum physiologique. Chez le nourrisson, celui-ci se fait notamment avec une dosette en position latérale."
        ]
      },
      {
        title: "5. 🩹 Cordon ombilical",
        careType: "cord",
        groups: [
          {
            title: "Matériel",
            items: ["Compresses propres.", "Eau tiède.", "Savon doux si nécessaire.", "Compresse sèche."]
          },
          {
            title: "Étapes",
            ordered: true,
            items: [
              "Observer le cordon et sa base.",
              "S’il doit être nettoyé, le nettoyer doucement avec de l’eau tiède et du savon.",
              "Retirer les éventuelles traces de sang ou souillures.",
              "Rincer.",
              "Prendre une compresse sèche.",
              "Sécher soigneusement en tamponnant, notamment autour et à la base du cordon.",
              "Laisser ensuite le cordon bien sec et à l’air autant que possible.",
              "Replier le haut de la couche sous le cordon pour éviter qu’elle ne le recouvre."
            ]
          }
        ],
        notes: ["L’antiseptique n’est pas nécessaire systématiquement : l’objectif principal est un cordon propre et surtout bien sec."]
      }
    ],
    orderLabel: "Ordre résumé des soins quotidiens",
    order: "Yeux → Visage → Nez → Cordon"
  },
  bath: {
    sections: [
      {
        title: "1. Préparer le bain",
        groups: [
          {
            title: "Matériel",
            items: [
              "Baignoire et thermomètre.",
              "Produit lavant bébé sans savon et, éventuellement, shampooing doux.",
              "Gant, linge doux ou main.",
              "Grande serviette.",
              "Couche propre et vêtements.",
              "Compresses pour le cordon."
            ]
          },
          {
            title: "Avant de commencer",
            items: [
              "Préparer absolument tout à portée de main.",
              "Se laver les mains.",
              "Maintenir la pièce entre 22 et 25 °C.",
              "Remplir la baignoire avec environ 8 à 12 cm d’eau.",
              "Mélanger l’eau.",
              "Vérifier avec le thermomètre que l’eau ne dépasse pas 37 °C."
            ]
          }
        ]
      },
      {
        title: "2. Nettoyer les fesses avant le bain si nécessaire",
        intro: "Si la couche contient des selles :",
        groups: [{ items: ["Retirer la couche.", "Nettoyer les fesses avant de mettre bébé dans l’eau.", "Ne pas contaminer l’eau du bain avec des selles."] }]
      },
      {
        title: "3. Mettre bébé dans l’eau",
        groups: [
          {
            items: [
              "Maintenir fermement bébé.",
              "Soutenir en permanence la tête, la nuque et l’épaule ou l’aisselle.",
              "Descendre doucement bébé dans l’eau."
            ]
          }
        ],
        notes: ["Ne jamais laisser bébé seul dans le bain, même quelques secondes."]
      },
      {
        title: "4. 🧴 Lavage",
        intro: "Principe : aller du plus propre vers le plus sale.",
        groups: [
          {
            title: "Ordre pratique",
            ordered: true,
            items: [
              "Tête et cheveux.",
              "Cou.",
              "Épaules et bras.",
              "Mains et entre les doigts.",
              "Torse.",
              "Ventre.",
              "Dos.",
              "Jambes.",
              "Pieds et entre les orteils.",
              "Organes génitaux.",
              "Fesses en dernier."
            ]
          },
          { title: "Bien passer dans les plis", items: ["Cou.", "Aisselles.", "Aine.", "Derrière les oreilles.", "Cuisses."] }
        ],
        notes: ["Le shampooing n’est pas nécessaire quotidiennement : 2 à 3 fois par semaine suffisent généralement."]
      },
      {
        title: "5. 💧 Rinçage",
        groups: [{ items: ["Rincer doucement avec l’eau du bain.", "Retirer les résidus de produit lavant.", "Éviter d’asperger directement le visage."] }]
      },
      {
        title: "6. 🧺 Sortie du bain",
        groups: [{ items: ["Sortir bébé en le maintenant à deux mains.", "Le poser immédiatement sur la serviette.", "Envelopper rapidement le corps et la tête."] }]
      },
      {
        title: "7. Séchage du corps",
        intro: "Pour le corps entier, utiliser une serviette douce plutôt que du coton.",
        groups: [
          {
            items: [
              "Tamponner ou éponger, sans frotter.",
              "Commencer par la tête, puis le haut du corps et le bas du corps.",
              "Insister derrière les oreilles, dans le cou, les aisselles, entre les doigts, à l’aine, dans les plis des cuisses, sur les fesses et entre les orteils."
            ]
          }
        ],
        notes: ["L’objectif est de ne laisser aucune zone humide dans les plis."]
      },
      {
        title: "8. 🩹 Cordon après le bain",
        intro: "Si le cordon est encore présent :",
        groups: [
          {
            ordered: true,
            items: [
              "Vérifier qu’il est propre.",
              "Prendre une compresse sèche.",
              "Sécher le cordon en tapotant, particulièrement sa base et son pourtour.",
              "Le laisser à l’air.",
              "Replier la couche sous le cordon."
            ]
          }
        ],
        notes: ["Le bain reste possible même avant la chute du cordon ; le point important est de le sécher complètement après."]
      }
    ],
    orderLabel: "Ordre résumé du bain",
    order: "Préparation → Fesses si souillées → Mise à l’eau → Tête → Haut du corps → Bas du corps → Sexe → Fesses → Rinçage → Sortie → Séchage → Cordon → Couche → Habillage"
  }
}

const en: CareGuideContent = {
  daily: {
    preparation: {
      title: "1. Preparation",
      groups: [{ items: ["Wash your hands.", "Prepare saline pods.", "Prepare sterile or non-woven compresses.", "Prepare cotton for making small wicks.", "Prepare warm water and a clean towel."] }]
    },
    sections: [
      {
        title: "2. 👁️ Eyes",
        careType: "eyes",
        groups: [
          { title: "Supplies", items: ["2 compresses, a different one for each eye.", "Saline solution."] },
          { title: "Steps", ordered: true, items: ["Soak a compress with saline solution.", "Gently wipe from the outside of the eye inward, toward the nose.", "Ideally, use each side of the compress for only one pass.", "Discard the compress.", "Clean the other eye with a new compress."] }
        ],
        notes: ["The direction currently recommended by the French national health insurance is outside → inward."]
      },
      {
        title: "3. 🙂 Face",
        careType: "face",
        groups: [
          { title: "Supplies", items: ["Clean compress or soft cotton.", "Warm water."] },
          { title: "Steps", ordered: true, items: ["Moisten the compress or cotton with warm water.", "Clean the forehead, cheeks, around the mouth, and chin.", "Clean behind the ears and the neck folds if needed.", "Pat dry without rubbing."] }
        ],
        notes: ["Warm water is generally enough for the face."]
      },
      {
        title: "4. 👃 Nose",
        careType: "nose",
        groups: [
          { title: "Supplies", items: ["2 small cotton wicks.", "Saline solution."] },
          { title: "Steps", ordered: true, items: ["Roll a small amount of cotton between your fingers to form a thin wick.", "Lightly moisten it with saline solution.", "Insert only the tip at the entrance of the nostril.", "Rotate gently to collect secretions.", "Discard the wick.", "Repeat with a new wick for the other nostril."] }
        ],
        notes: ["Do not push deeply into the nostril.", "If the nose is truly congested, cotton wicks do not replace nasal rinsing with saline. For an infant, this can be done with a saline pod while the baby lies on their side."]
      },
      {
        title: "5. 🩹 Umbilical cord",
        careType: "cord",
        groups: [
          { title: "Supplies", items: ["Clean compresses.", "Warm water.", "Mild soap if needed.", "Dry compress."] },
          { title: "Steps", ordered: true, items: ["Inspect the cord and its base.", "If it needs cleaning, gently clean it with warm water and soap.", "Remove any traces of blood or dirt.", "Rinse.", "Take a dry compress.", "Pat completely dry, especially around and at the base of the cord.", "Keep the cord dry and exposed to air as much as possible.", "Fold the top of the diaper below the cord so it does not cover it."] }
        ],
        notes: ["Antiseptic is not routinely necessary: the main goal is to keep the cord clean and, above all, dry."]
      }
    ],
    orderLabel: "Daily care summary",
    order: "Eyes → Face → Nose → Umbilical cord"
  },
  bath: {
    sections: [
      {
        title: "1. Prepare the bath",
        groups: [
          { title: "Supplies", items: ["Baby bath and thermometer.", "Soap-free baby wash and, optionally, gentle shampoo.", "Washcloth, soft cloth, or your hand.", "Large towel.", "Clean diaper and clothes.", "Compresses for the umbilical cord."] },
          { title: "Before starting", items: ["Put absolutely everything within reach.", "Wash your hands.", "Keep the room between 22 and 25 °C.", "Fill the bath with about 8 to 12 cm of water.", "Mix the water.", "Use the thermometer to check that the water is no warmer than 37 °C."] }
        ]
      },
      {
        title: "2. Clean the bottom before the bath if needed",
        intro: "If the diaper contains stool:",
        groups: [{ items: ["Remove the diaper.", "Clean the bottom before placing the baby in the water.", "Do not contaminate the bath water with stool."] }]
      },
      {
        title: "3. Place the baby in the water",
        groups: [{ items: ["Hold the baby securely.", "Continuously support the head, neck, and shoulder or armpit.", "Gently lower the baby into the water."] }],
        notes: ["Never leave the baby alone in the bath, even for a few seconds."]
      },
      {
        title: "4. 🧴 Washing",
        intro: "Principle: wash from the cleanest area to the dirtiest.",
        groups: [
          { title: "Practical order", ordered: true, items: ["Head and hair.", "Neck.", "Shoulders and arms.", "Hands and between the fingers.", "Chest.", "Tummy.", "Back.", "Legs.", "Feet and between the toes.", "Genitals.", "Bottom last."] },
          { title: "Clean all skin folds", items: ["Neck.", "Armpits.", "Groin.", "Behind the ears.", "Thighs."] }
        ],
        notes: ["Shampoo is not needed every day: 2 to 3 times a week is generally enough."]
      },
      { title: "5. 💧 Rinsing", groups: [{ items: ["Rinse gently with the bath water.", "Remove any remaining cleanser.", "Avoid splashing water directly onto the face."] }] },
      { title: "6. 🧺 Getting out of the bath", groups: [{ items: ["Lift the baby out while holding them with both hands.", "Place them immediately on the towel.", "Quickly wrap the body and head."] }] },
      {
        title: "7. Drying the body",
        intro: "Use a soft towel rather than cotton for the whole body.",
        groups: [{ items: ["Pat dry without rubbing.", "Start with the head, then the upper body and lower body.", "Pay special attention behind the ears, the neck, armpits, between the fingers, the groin, thigh folds, bottom, and between the toes."] }],
        notes: ["The goal is to leave no moisture in any skin fold."]
      },
      {
        title: "8. 🩹 Umbilical cord after the bath",
        intro: "If the umbilical cord is still present:",
        groups: [{ ordered: true, items: ["Check that it is clean.", "Take a dry compress.", "Pat the cord dry, especially its base and the surrounding area.", "Leave it exposed to air.", "Fold the diaper below the cord."] }],
        notes: ["Bathing is possible before the cord falls off; the important point is to dry it completely afterward."]
      }
    ],
    orderLabel: "Bath summary",
    order: "Preparation → Bottom if soiled → Into the water → Head → Upper body → Lower body → Genitals → Bottom → Rinse → Out of the bath → Dry → Umbilical cord → Diaper → Clothes"
  }
}

export const careGuides: Record<SupportedLocale, CareGuideContent> = { fr, en }
