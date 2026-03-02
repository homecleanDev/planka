/**
 * Project.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

const BackgroundTypes = {
  GRADIENT: 'gradient',
  IMAGE: 'image',
};

const BACKGROUND_GRADIENTS = [
  'old-lime',
  'ocean-dive',
  'tzepesch-style',
  'jungle-mesh',
  'strawberry-dust',
  'purple-rose',
  'sun-scream',
  'warm-rust',
  'sky-change',
  'green-eyes',
  'blue-xchange',
  'blood-orange',
  'sour-peel',
  'green-ninja',
  'algae-green',
  'coral-reef',
  'steel-grey',
  'heat-waves',
  'velvet-lounge',
  'purple-rain',
  'blue-steel',
  'blueish-curve',
  'prism-light',
  'green-mist',
  'red-curtain',
];

module.exports = {
  BackgroundTypes,
  BACKGROUND_GRADIENTS,

  attributes: {
    //  ╔═╗╦═╗╦╔╦╗╦╔╦╗╦╦  ╦╔═╗╔═╗
    //  ╠═╝╠╦╝║║║║║ ║ ║╚╗╔╝║╣ ╚═╗
    //  ╩  ╩╚═╩╩ ╩╩ ╩ ╩ ╚╝ ╚═╝╚═╝

    name: {
      type: 'string',
      required: true,
    },
    background: {
      type: 'json',
    },
    backgroundImage: {
      type: 'json',
      columnName: 'background_image',
    },
    member_card_deletion_enabled: {
      type: 'boolean',
      defaultsTo: false,
    },
    cardFields: {
      type: 'json',
      columnName: 'card_fields',
    },

    //  ╔═╗╔╦╗╔╗ ╔═╗╔╦╗╔═╗
    //  ║╣ ║║║╠╩╗║╣  ║║╚═╗
    //  ╚═╝╩ ╩╚═╝╚═╝═╩╝╚═╝

    //  ╔═╗╔═╗╔═╗╔═╗╔═╗╦╔═╗╔╦╗╦╔═╗╔╗╔╔═╗
    //  ╠═╣╚═╗╚═╗║ ║║  ║╠═╣ ║ ║║ ║║║║╚═╗
    //  ╩ ╩╚═╝╚═╝╚═╝╚═╝╩╩ ╩ ╩ ╩╚═╝╝╚╝╚═╝

    managerUsers: {
      collection: 'User',
      via: 'projectId',
      through: 'ProjectManager',
    },
    boards: {
      collection: 'Board',
      via: 'projectId',
    },
  },

  customToJSON() {
    return {
      ..._.omit(this, ['backgroundImage']),
      backgroundImage: this.backgroundImage && {
        url: `${sails.config.custom.projectBackgroundImagesUrl}/${this.backgroundImage.dirname}/original.${this.backgroundImage.extension}`,
        coverUrl: `${sails.config.custom.projectBackgroundImagesUrl}/${this.backgroundImage.dirname}/cover-336.${this.backgroundImage.extension}`,
      },
    };
  },
};
